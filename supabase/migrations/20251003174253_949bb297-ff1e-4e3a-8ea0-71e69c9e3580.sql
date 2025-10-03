-- QR Codes & Tokens Epic

-- 1. Create qr_tokens table
CREATE TABLE public.qr_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoke_reason TEXT,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  scopes JSONB NOT NULL DEFAULT '{"basic_info": true}'::JSONB,
  max_scans INTEGER,
  scan_count INTEGER NOT NULL DEFAULT 0
);

-- 2. Create qr_scan_events table for audit logging
CREATE TABLE public.qr_scan_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_token_id UUID NOT NULL REFERENCES public.qr_tokens(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES auth.users(id),
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  location TEXT,
  access_granted BOOLEAN NOT NULL,
  denial_reason TEXT,
  metadata JSONB
);

-- 3. Enable RLS
ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scan_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for qr_tokens
CREATE POLICY "FD can create QR tokens for their dossiers"
ON public.qr_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'funeral_director') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "FD can view QR tokens"
ON public.qr_tokens
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'funeral_director') OR 
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'insurer')
);

CREATE POLICY "FD can update their QR tokens"
ON public.qr_tokens
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() OR 
  has_role(auth.uid(), 'admin')
);

-- 5. RLS Policies for qr_scan_events
CREATE POLICY "System can insert scan events"
ON public.qr_scan_events
FOR INSERT
WITH CHECK (true);

CREATE POLICY "FD can view scan events"
ON public.qr_scan_events
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'funeral_director') OR 
  has_role(auth.uid(), 'admin')
);

-- 6. Function to generate unique QR token
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 32-character random token
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(token, '/', '_');
    token := replace(token, '+', '-');
    
    SELECT EXISTS(SELECT 1 FROM qr_tokens WHERE qr_tokens.token = token) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN token;
END;
$$;

-- 7. Function to verify and consume QR token
CREATE OR REPLACE FUNCTION public.verify_qr_token(
  p_token TEXT,
  p_scanned_by UUID DEFAULT NULL,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token RECORD;
  v_dossier RECORD;
  v_access_granted BOOLEAN := FALSE;
  v_denial_reason TEXT;
BEGIN
  -- Find token
  SELECT * INTO v_token
  FROM qr_tokens
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    -- Log failed scan
    INSERT INTO qr_scan_events (
      qr_token_id,
      scanned_by,
      ip_address,
      user_agent,
      access_granted,
      denial_reason
    ) VALUES (
      NULL,
      p_scanned_by,
      p_ip::INET,
      p_user_agent,
      FALSE,
      'Invalid token'
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid token'
    );
  END IF;
  
  -- Check if revoked
  IF v_token.revoked THEN
    v_denial_reason := 'Token has been revoked';
    v_access_granted := FALSE;
  -- Check if expired
  ELSIF v_token.expires_at < NOW() THEN
    v_denial_reason := 'Token has expired';
    v_access_granted := FALSE;
  -- Check max scans
  ELSIF v_token.max_scans IS NOT NULL AND v_token.scan_count >= v_token.max_scans THEN
    v_denial_reason := 'Maximum scan limit reached';
    v_access_granted := FALSE;
  ELSE
    v_access_granted := TRUE;
  END IF;
  
  -- Log scan event
  INSERT INTO qr_scan_events (
    qr_token_id,
    scanned_by,
    ip_address,
    user_agent,
    access_granted,
    denial_reason
  ) VALUES (
    v_token.id,
    p_scanned_by,
    p_ip::INET,
    p_user_agent,
    v_access_granted,
    v_denial_reason
  );
  
  -- Increment scan count if access granted
  IF v_access_granted THEN
    UPDATE qr_tokens
    SET scan_count = scan_count + 1
    WHERE id = v_token.id;
    
    -- Get dossier info based on scopes
    SELECT * INTO v_dossier
    FROM dossiers
    WHERE id = v_token.dossier_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'dossier_id', v_dossier.id,
      'display_id', v_dossier.display_id,
      'scopes', v_token.scopes,
      'dossier_info', jsonb_build_object(
        'deceased_name', CASE WHEN (v_token.scopes->>'basic_info')::boolean THEN v_dossier.deceased_name ELSE NULL END,
        'status', v_dossier.status,
        'flow', v_dossier.flow
      )
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', v_denial_reason
    );
  END IF;
END;
$$;

-- 8. Function to revoke QR token
CREATE OR REPLACE FUNCTION public.revoke_qr_token(
  p_token_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE qr_tokens
  SET 
    revoked = TRUE,
    revoke_reason = p_reason,
    revoked_at = NOW(),
    revoked_by = auth.uid()
  WHERE id = p_token_id;
  
  -- Audit log
  INSERT INTO audit_events (
    user_id,
    event_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    'QR_TOKEN_REVOKED',
    'QRToken',
    p_token_id,
    'QR token revoked',
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

-- 9. Cleanup expired tokens (can be run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_qr_tokens()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete tokens expired for more than 30 days
  DELETE FROM qr_tokens
  WHERE expires_at < NOW() - INTERVAL '30 days';
END;
$$;