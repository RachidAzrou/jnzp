-- Fix generate_qr_token_rpc to include created_by
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
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Generate unique token
  v_token := generate_qr_token();
  
  -- Calculate expiration
  v_expires_at := NOW() + (p_expires_hours || ' hours')::INTERVAL;
  
  -- Insert token WITH created_by
  INSERT INTO qr_tokens (
    dossier_id,
    token,
    created_by,
    scopes,
    max_scans,
    expires_at
  ) VALUES (
    p_dossier_id,
    v_token,
    v_user_id,
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
GRANT EXECUTE ON FUNCTION generate_qr_token_rpc(UUID, JSONB, INTEGER, INTEGER) TO authenticated;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';