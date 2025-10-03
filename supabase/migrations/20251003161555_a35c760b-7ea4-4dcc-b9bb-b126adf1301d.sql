-- Drop onveilige functie
DROP FUNCTION IF EXISTS public.get_2fa_settings_for_verification(UUID);

-- Maak pending_2fa tabel voor kortstondige nonces
CREATE TABLE IF NOT EXISTS public.pending_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nonce UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
  used BOOLEAN NOT NULL DEFAULT FALSE,
  ip INET,
  user_agent TEXT
);

-- RLS aan - niemand mag direct selecteren
ALTER TABLE public.pending_2fa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nobody direct selects"
ON public.pending_2fa 
FOR SELECT 
USING (FALSE);

-- Index voor snelle nonce lookup
CREATE INDEX idx_pending_2fa_nonce ON public.pending_2fa(nonce) WHERE NOT used;

-- Cleanup functie voor verlopen nonces
CREATE OR REPLACE FUNCTION public.cleanup_expired_2fa_nonces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM pending_2fa
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$;

-- Veilige functie: alleen met geldige nonce
CREATE OR REPLACE FUNCTION public.get_2fa_settings_with_nonce(
  p_nonce UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending RECORD;
  v_settings RECORD;
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
  
  -- Markeer nonce als gebruikt (single-use)
  UPDATE pending_2fa
  SET used = TRUE
  WHERE id = v_pending.id;
  
  -- Haal 2FA settings op
  SELECT totp_enabled, totp_secret, recovery_codes
  INTO v_settings
  FROM user_2fa_settings
  WHERE user_id = v_pending.user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', true,
      'totp_enabled', false
    );
  END IF;
  
  -- Return minimal info
  RETURN jsonb_build_object(
    'valid', true,
    'totp_enabled', v_settings.totp_enabled,
    'totp_secret', v_settings.totp_secret,
    'recovery_codes', v_settings.recovery_codes,
    'user_id', v_pending.user_id
  );
END;
$$;

-- Functie om nonce aan te maken na password verificatie
CREATE OR REPLACE FUNCTION public.create_2fa_nonce(
  p_user_id UUID,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nonce UUID;
BEGIN
  -- Cleanup oude nonces van deze user
  DELETE FROM pending_2fa
  WHERE user_id = p_user_id;
  
  -- Maak nieuwe nonce
  INSERT INTO pending_2fa (user_id, ip, user_agent)
  VALUES (p_user_id, p_ip::INET, p_user_agent)
  RETURNING nonce INTO v_nonce;
  
  RETURN v_nonce;
END;
$$;