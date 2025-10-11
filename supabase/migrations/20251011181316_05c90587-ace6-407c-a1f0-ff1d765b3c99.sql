-- FIX 2: Create RPC endpoint for QR token generation
CREATE OR REPLACE FUNCTION public.generate_qr_token_rpc(
  p_dossier_id UUID,
  p_scopes JSONB DEFAULT '{"basic_info": true}'::jsonb,
  p_max_scans INT DEFAULT NULL,
  p_expires_hours INT DEFAULT 168
)
RETURNS TABLE (
  token TEXT,
  expires_at TIMESTAMPTZ,
  qr_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_expires TIMESTAMPTZ;
  v_qr_id UUID;
BEGIN
  -- Generate unique token using existing function
  v_token := generate_qr_token();
  v_expires := NOW() + (p_expires_hours || ' hours')::INTERVAL;
  
  -- Insert in qr_tokens
  INSERT INTO qr_tokens (dossier_id, token, scopes, max_scans, expires_at, created_by)
  VALUES (p_dossier_id, v_token, p_scopes, p_max_scans, v_expires, auth.uid())
  RETURNING id INTO v_qr_id;
  
  -- Return result with constructed URL
  RETURN QUERY
  SELECT 
    v_token,
    v_expires,
    ('/qr-scan/' || v_token) AS qr_url;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_qr_token_rpc TO authenticated;