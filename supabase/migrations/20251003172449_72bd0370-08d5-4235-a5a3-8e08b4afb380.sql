-- Device Trust for 2FA
-- Users can mark devices as trusted to skip 2FA for 30 days

CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  ip_address INET,
  user_agent TEXT,
  trusted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_fingerprint)
);

-- Enable RLS
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- Users can view their own trusted devices
CREATE POLICY "Users can view their own trusted devices"
ON public.trusted_devices
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own trusted devices
CREATE POLICY "Users can delete their own trusted devices"
ON public.trusted_devices
FOR DELETE
USING (auth.uid() = user_id);

-- System can manage trusted devices
CREATE POLICY "System can manage trusted devices"
ON public.trusted_devices
FOR ALL
USING (true);

-- Function to check if device is trusted
CREATE OR REPLACE FUNCTION public.is_device_trusted(
  p_user_id UUID,
  p_device_fingerprint TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trusted BOOLEAN;
BEGIN
  -- Check if device exists and is not expired
  SELECT EXISTS(
    SELECT 1 
    FROM trusted_devices
    WHERE user_id = p_user_id
      AND device_fingerprint = p_device_fingerprint
      AND expires_at > NOW()
  ) INTO v_trusted;
  
  -- Update last_used_at if trusted
  IF v_trusted THEN
    UPDATE trusted_devices
    SET last_used_at = NOW()
    WHERE user_id = p_user_id
      AND device_fingerprint = p_device_fingerprint;
  END IF;
  
  RETURN v_trusted;
END;
$$;

-- Function to trust a device
CREATE OR REPLACE FUNCTION public.trust_device(
  p_user_id UUID,
  p_device_fingerprint TEXT,
  p_device_name TEXT DEFAULT NULL,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_id UUID;
BEGIN
  -- Insert or update device
  INSERT INTO trusted_devices (
    user_id,
    device_fingerprint,
    device_name,
    ip_address,
    user_agent,
    trusted_at,
    expires_at
  ) VALUES (
    p_user_id,
    p_device_fingerprint,
    p_device_name,
    p_ip::INET,
    p_user_agent,
    NOW(),
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (user_id, device_fingerprint)
  DO UPDATE SET
    trusted_at = NOW(),
    expires_at = NOW() + INTERVAL '30 days',
    last_used_at = NOW(),
    device_name = COALESCE(EXCLUDED.device_name, trusted_devices.device_name),
    ip_address = COALESCE(EXCLUDED.ip_address, trusted_devices.ip_address),
    user_agent = COALESCE(EXCLUDED.user_agent, trusted_devices.user_agent)
  RETURNING id INTO v_device_id;
  
  RETURN v_device_id;
END;
$$;

-- Function to cleanup expired trusted devices
CREATE OR REPLACE FUNCTION public.cleanup_expired_trusted_devices()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM trusted_devices
  WHERE expires_at < NOW();
END;
$$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_fingerprint 
ON public.trusted_devices(user_id, device_fingerprint);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires 
ON public.trusted_devices(expires_at);

-- Log the security configuration
INSERT INTO audit_events (
  user_id,
  actor_role,
  event_type,
  target_type,
  description,
  metadata
) VALUES (
  NULL,
  'platform_admin',
  'SECURITY_CONFIG',
  'SYSTEM',
  'Device trust for 2FA configured',
  jsonb_build_object(
    'feature', 'device_trust',
    'expiry_days', 30,
    'timestamp', NOW()
  )
);