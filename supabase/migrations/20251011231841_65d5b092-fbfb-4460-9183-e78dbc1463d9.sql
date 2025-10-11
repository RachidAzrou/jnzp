-- Fix generate_qr_token() function to use public.gen_random_bytes explicitly
DROP FUNCTION IF EXISTS generate_qr_token();

CREATE OR REPLACE FUNCTION generate_qr_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 32-character token using public.gen_random_bytes
    new_token := encode(public.gen_random_bytes(24), 'base64');
    new_token := replace(replace(replace(new_token, '+', ''), '/', ''), '=', '');
    new_token := substring(new_token, 1, 32);
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM qr_tokens WHERE token = new_token) INTO token_exists;
    
    -- If token is unique, exit loop
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN new_token;
END;
$$;

-- Recreate generate_qr_token_rpc to ensure it works
DROP FUNCTION IF EXISTS generate_qr_token_rpc(UUID, JSONB, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION generate_qr_token_rpc(
  p_dossier_id UUID,
  p_scopes JSONB DEFAULT '{"basic_info": true, "documents": false, "timeline": true}'::jsonb,
  p_max_scans INTEGER DEFAULT NULL,
  p_expires_hours INTEGER DEFAULT 720
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_token_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate unique token using the fixed function
  v_token := generate_qr_token();
  
  -- Calculate expiration
  v_expires_at := NOW() + (p_expires_hours || ' hours')::INTERVAL;
  
  -- Insert token
  INSERT INTO qr_tokens (
    dossier_id,
    token,
    scopes,
    max_scans,
    expires_at
  ) VALUES (
    p_dossier_id,
    v_token,
    p_scopes,
    p_max_scans,
    v_expires_at
  )
  RETURNING id INTO v_token_id;
  
  -- Return token info
  RETURN jsonb_build_object(
    'success', true,
    'token_id', v_token_id,
    'token', v_token,
    'expires_at', v_expires_at
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_qr_token() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_qr_token_rpc(UUID, JSONB, INTEGER, INTEGER) TO authenticated;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';