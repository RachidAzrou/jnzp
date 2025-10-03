-- Update verify_totp_code om huidige Unix timestamp te retourneren
CREATE OR REPLACE FUNCTION public.verify_totp_code(
  p_nonce UUID,
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending RECORD;
  v_settings RECORD;
  v_now BIGINT;
  v_step INTEGER := 30;
  v_current_period INTEGER;
  v_test_period INTEGER;
  v_periods INTEGER[];
  v_valid_period INTEGER := NULL;
BEGIN
  -- Check nonce geldigheid
  SELECT * INTO v_pending
  FROM pending_2fa
  WHERE nonce = p_nonce
    AND NOT used
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired nonce'
    );
  END IF;
  
  -- Haal 2FA settings op
  SELECT totp_enabled, totp_secret
  INTO v_settings
  FROM user_2fa_settings
  WHERE user_id = v_pending.user_id;
  
  IF NOT FOUND OR NOT v_settings.totp_enabled THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '2FA not enabled'
    );
  END IF;
  
  -- Bereken huidige periode en candidates (window = 1)
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;
  v_current_period := (v_now / v_step)::INTEGER;
  v_periods := ARRAY[v_current_period - 1, v_current_period, v_current_period + 1];
  
  -- Test elke periode binnen de window
  FOREACH v_test_period IN ARRAY v_periods
  LOOP
    -- Check of deze periode al gebruikt is
    IF EXISTS (
      SELECT 1 FROM user_totp_replay_guard 
      WHERE user_id = v_pending.user_id 
      AND period = v_test_period
    ) THEN
      -- Periode al gebruikt, skip
      CONTINUE;
    END IF;
    
    -- Gebruik eerste beschikbare periode
    v_valid_period := v_test_period;
    EXIT;
  END LOOP;
  
  IF v_valid_period IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'All time periods already used'
    );
  END IF;
  
  -- Return info voor client-side validatie inclusief de exacte Unix timestamp
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_pending.user_id,
    'secret', v_settings.totp_secret,
    'period', v_valid_period,
    'step', v_step,
    'timestamp', v_now
  );
END;
$$;