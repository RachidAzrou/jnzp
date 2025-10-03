-- Create a function to get 2FA settings without active session
CREATE OR REPLACE FUNCTION public.get_2fa_settings_for_verification(
  p_user_id UUID
)
RETURNS TABLE (
  totp_secret TEXT,
  recovery_codes TEXT[],
  totp_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    user_2fa_settings.totp_secret,
    user_2fa_settings.recovery_codes,
    user_2fa_settings.totp_enabled
  FROM user_2fa_settings
  WHERE user_2fa_settings.user_id = p_user_id;
END;
$$;

-- Create function to update 2FA verification timestamp
CREATE OR REPLACE FUNCTION public.update_2fa_verification(
  p_user_id UUID,
  p_recovery_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_recovery_code IS NOT NULL THEN
    -- Remove used recovery code and update timestamp
    UPDATE user_2fa_settings
    SET recovery_codes = array_remove(recovery_codes, UPPER(p_recovery_code)),
        last_verified_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Just update timestamp
    UPDATE user_2fa_settings
    SET last_verified_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;