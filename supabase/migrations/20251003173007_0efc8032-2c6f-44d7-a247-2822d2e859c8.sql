-- Enhanced Device Trust with Token Rotation & Risk-Based Security
-- Production-grade implementation with HttpOnly cookies

-- Drop old implementation
DROP TABLE IF EXISTS public.trusted_devices CASCADE;
DROP FUNCTION IF EXISTS public.is_device_trusted CASCADE;
DROP FUNCTION IF EXISTS public.trust_device CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_trusted_devices CASCADE;

-- Enhanced trusted devices table with token hashing and risk scoring
CREATE TABLE public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Security tokens (NEVER store raw tokens)
  token_hash TEXT NOT NULL UNIQUE,
  
  -- Device identification
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  
  -- Soft bindings for risk scoring
  user_agent_hash TEXT,
  ip_prefix INET, -- Only store /24 for privacy
  
  -- Risk management
  risk_score INTEGER NOT NULL DEFAULT 0, -- 0-100 scale
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoke_reason TEXT,
  
  -- Token lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Constraints
  CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 100),
  UNIQUE(user_id, device_fingerprint)
);

-- Indexes for performance
CREATE INDEX idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX idx_trusted_devices_token_hash ON public.trusted_devices(token_hash) WHERE NOT revoked;
CREATE INDEX idx_trusted_devices_expires ON public.trusted_devices(expires_at) WHERE NOT revoked;
CREATE INDEX idx_trusted_devices_risk ON public.trusted_devices(risk_score) WHERE NOT revoked;

-- RLS Policies
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own devices"
  ON public.trusted_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can revoke their own devices"
  ON public.trusted_devices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND revoked = true);

CREATE POLICY "System can manage all devices"
  ON public.trusted_devices FOR ALL
  USING (true);

-- Function to calculate IP prefix (/24)
CREATE OR REPLACE FUNCTION public.get_ip_prefix(p_ip TEXT)
RETURNS INET
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_ip IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extract /24 prefix (first 3 octets)
  RETURN (regexp_replace(p_ip, '(\d+\.\d+\.\d+)\.\d+', '\1.0'))::INET;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Function to calculate risk score
CREATE OR REPLACE FUNCTION public.calculate_device_risk(
  p_device_id UUID,
  p_current_ip TEXT,
  p_current_user_agent TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_risk INTEGER := 0;
  v_current_ip_prefix INET;
  v_current_ua_hash TEXT;
BEGIN
  SELECT * INTO v_device
  FROM trusted_devices
  WHERE id = p_device_id;
  
  IF NOT FOUND THEN
    RETURN 100; -- Unknown device = max risk
  END IF;
  
  -- Calculate current hashes
  v_current_ip_prefix := get_ip_prefix(p_current_ip);
  v_current_ua_hash := encode(digest(p_current_user_agent, 'sha256'), 'hex');
  
  -- Check IP prefix change (different network = +30 risk)
  IF v_device.ip_prefix IS NOT NULL AND v_current_ip_prefix IS NOT NULL THEN
    IF v_device.ip_prefix != v_current_ip_prefix THEN
      v_risk := v_risk + 30;
    END IF;
  END IF;
  
  -- Check user agent change (+20 risk)
  IF v_device.user_agent_hash IS NOT NULL AND v_current_ua_hash IS NOT NULL THEN
    IF v_device.user_agent_hash != v_current_ua_hash THEN
      v_risk := v_risk + 20;
    END IF;
  END IF;
  
  -- Check age (older tokens = higher risk)
  IF v_device.last_used_at < NOW() - INTERVAL '14 days' THEN
    v_risk := v_risk + 20;
  ELSIF v_device.last_used_at < NOW() - INTERVAL '7 days' THEN
    v_risk := v_risk + 10;
  END IF;
  
  -- Check rotation age (needs rotation = +10 risk)
  IF v_device.last_rotated_at < NOW() - INTERVAL '7 days' THEN
    v_risk := v_risk + 10;
  END IF;
  
  RETURN LEAST(v_risk, 100);
END;
$$;

-- Function to verify device token (called by edge function)
CREATE OR REPLACE FUNCTION public.verify_device_token(
  p_token_hash TEXT,
  p_current_ip TEXT DEFAULT NULL,
  p_current_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_risk INTEGER;
  v_needs_rotation BOOLEAN;
BEGIN
  -- Find device by token hash
  SELECT * INTO v_device
  FROM trusted_devices
  WHERE token_hash = p_token_hash
    AND NOT revoked
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or expired device token'
    );
  END IF;
  
  -- Calculate current risk score
  v_risk := calculate_device_risk(v_device.id, p_current_ip, p_current_user_agent);
  
  -- Check if rotation is needed (>7 days old)
  v_needs_rotation := v_device.last_rotated_at < NOW() - INTERVAL '7 days';
  
  -- Update last_used_at and risk_score
  UPDATE trusted_devices
  SET 
    last_used_at = NOW(),
    risk_score = v_risk,
    expires_at = NOW() + INTERVAL '30 days' -- Rolling expiration
  WHERE id = v_device.id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'user_id', v_device.user_id,
    'device_id', v_device.id,
    'risk_score', v_risk,
    'needs_rotation', v_needs_rotation,
    'requires_2fa', v_risk >= 50 -- High risk = force 2FA
  );
END;
$$;

-- Function to create/rotate device token (called by edge function)
CREATE OR REPLACE FUNCTION public.register_device_token(
  p_user_id UUID,
  p_token_hash TEXT,
  p_device_fingerprint TEXT,
  p_device_name TEXT DEFAULT NULL,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_old_token_hash TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_id UUID;
  v_ip_prefix INET;
  v_ua_hash TEXT;
BEGIN
  -- Calculate hashes
  v_ip_prefix := get_ip_prefix(p_ip);
  v_ua_hash := CASE 
    WHEN p_user_agent IS NOT NULL 
    THEN encode(digest(p_user_agent, 'sha256'), 'hex')
    ELSE NULL 
  END;
  
  -- If this is a rotation, revoke old token
  IF p_old_token_hash IS NOT NULL THEN
    UPDATE trusted_devices
    SET revoked = true, revoke_reason = 'Token rotated'
    WHERE token_hash = p_old_token_hash;
  END IF;
  
  -- Insert new device token
  INSERT INTO trusted_devices (
    user_id,
    token_hash,
    device_fingerprint,
    device_name,
    user_agent_hash,
    ip_prefix,
    risk_score
  ) VALUES (
    p_user_id,
    p_token_hash,
    p_device_fingerprint,
    p_device_name,
    v_ua_hash,
    v_ip_prefix,
    0 -- New device starts with 0 risk
  )
  ON CONFLICT (user_id, device_fingerprint)
  DO UPDATE SET
    token_hash = EXCLUDED.token_hash,
    last_rotated_at = NOW(),
    last_used_at = NOW(),
    expires_at = NOW() + INTERVAL '30 days',
    revoked = false,
    risk_score = 0
  RETURNING id INTO v_device_id;
  
  RETURN v_device_id;
END;
$$;

-- Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_device_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired tokens
  DELETE FROM trusted_devices
  WHERE expires_at < NOW() - INTERVAL '7 days';
  
  -- Delete revoked tokens older than 90 days
  DELETE FROM trusted_devices
  WHERE revoked = true
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Audit log
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
  'Production-grade device trust with token rotation configured',
  jsonb_build_object(
    'feature', 'device_trust_v2',
    'token_rotation', '7_days',
    'max_expiry', '30_days',
    'risk_threshold', 50,
    'timestamp', NOW()
  )
);