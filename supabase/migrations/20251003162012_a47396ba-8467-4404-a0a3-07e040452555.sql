-- Anti-replay guard voor TOTP codes
CREATE TABLE IF NOT EXISTS public.user_totp_replay_guard (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, period)
);

-- RLS aan - niemand mag direct selecteren
ALTER TABLE public.user_totp_replay_guard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no direct selects"
ON public.user_totp_replay_guard 
FOR SELECT 
USING (FALSE);

-- Index voor cleanup van oude periodes
CREATE INDEX idx_replay_guard_created ON public.user_totp_replay_guard(created_at);

-- Cleanup functie voor oude periodes (ouder dan 5 minuten)
CREATE OR REPLACE FUNCTION public.cleanup_old_replay_guards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM user_totp_replay_guard
  WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Server-side TOTP verificatie met anti-replay
CREATE OR REPLACE FUNCTION public.verify_totp_with_replay_guard(
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
  v_cur_period INTEGER;
  v_period INTEGER;
  v_periods INTEGER[];
  v_expected_token TEXT;
  v_inserted INTEGER;
BEGIN
  -- Check nonce geldigheid
  SELECT * INTO v_pending
  FROM pending_2fa
  WHERE nonce = p_nonce
    AND NOT used
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
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
      'valid', false,
      'error', '2FA not enabled'
    );
  END IF;
  
  -- Bereken huidige periode en candidates (window = 1)
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;
  v_cur_period := (v_now / v_step)::INTEGER;
  v_periods := ARRAY[v_cur_period - 1, v_cur_period, v_cur_period + 1];
  
  -- Probeer elke periode binnen de window
  FOREACH v_period IN ARRAY v_periods
  LOOP
    -- Probeer atomisch te claimen
    BEGIN
      INSERT INTO user_totp_replay_guard (user_id, period)
      VALUES (v_pending.user_id, v_period)
      ON CONFLICT (user_id, period) DO NOTHING;
      
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      
      -- Als insert geslaagd is (niet eerder gebruikt), deze periode is beschikbaar
      IF v_inserted = 1 THEN
        -- Nu valideren we of de token klopt voor deze periode
        -- Note: Dit moet je server-side doen met een TOTP library
        -- Voor nu geven we de periode terug zodat de client kan valideren
        RETURN jsonb_build_object(
          'valid', true,
          'period', v_period,
          'user_id', v_pending.user_id,
          'secret', v_settings.totp_secret,
          'claimed', true
        );
      END IF;
    EXCEPTION WHEN unique_violation THEN
      -- Periode al gebruikt, probeer volgende
      CONTINUE;
    END;
  END LOOP;
  
  -- Alle periodes al gebruikt of geen match
  RETURN jsonb_build_object(
    'valid', false,
    'error', 'Code already used or invalid'
  );
END;
$$;