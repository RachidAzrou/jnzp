-- Password reset tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '60 minutes',
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON public.password_reset_tokens(user_id);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS: System can manage tokens
CREATE POLICY "System can manage password reset tokens"
ON public.password_reset_tokens
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete tokens expired for more than 24 hours
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Function to check password reset rate limit
CREATE OR REPLACE FUNCTION public.check_password_reset_rate_limit(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_reset_count INTEGER;
BEGIN
  -- Get user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    -- Don't reveal if user exists (prevent enumeration)
    RETURN jsonb_build_object(
      'allowed', true
    );
  END IF;
  
  -- Count reset requests in last hour
  SELECT COUNT(*) INTO v_reset_count
  FROM public.password_reset_tokens
  WHERE user_id = v_user_id
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Allow max 3 requests per hour
  IF v_reset_count >= 3 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Te veel reset-verzoeken. Probeer het over een uur opnieuw.',
      'retry_after', 3600 - EXTRACT(EPOCH FROM (NOW() - (
        SELECT created_at FROM public.password_reset_tokens
        WHERE user_id = v_user_id
        ORDER BY created_at ASC
        LIMIT 1 OFFSET 2
      )))::INTEGER
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'user_id', v_user_id
  );
END;
$$;

-- Function to verify and use reset token
CREATE OR REPLACE FUNCTION public.verify_password_reset_token(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token RECORD;
  v_requires_2fa BOOLEAN;
BEGIN
  -- Find valid token
  SELECT * INTO v_token
  FROM public.password_reset_tokens
  WHERE token_hash = p_token_hash
    AND NOT used
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Ongeldige of verlopen reset link'
    );
  END IF;
  
  -- Check if user requires 2FA
  v_requires_2fa := check_2fa_requirement(v_token.user_id);
  
  RETURN jsonb_build_object(
    'valid', true,
    'user_id', v_token.user_id,
    'requires_2fa', v_requires_2fa,
    'token_id', v_token.id
  );
END;
$$;

-- Function to mark token as used
CREATE OR REPLACE FUNCTION public.mark_password_reset_token_used(p_token_hash TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.password_reset_tokens
  SET used = TRUE,
      used_at = NOW()
  WHERE token_hash = p_token_hash;
END;
$$;

-- Function to log password change
CREATE OR REPLACE FUNCTION public.log_password_change(p_user_id UUID, p_method TEXT, p_ip TEXT DEFAULT NULL, p_user_agent TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert audit log
  INSERT INTO public.audit_events (
    user_id,
    event_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    p_user_id,
    'PASSWORD_CHANGED',
    'User',
    p_user_id,
    CASE 
      WHEN p_method = 'RESET' THEN 'Wachtwoord gewijzigd via reset link'
      WHEN p_method = 'PROFILE' THEN 'Wachtwoord gewijzigd via profiel'
      ELSE 'Wachtwoord gewijzigd'
    END,
    jsonb_build_object(
      'method', p_method,
      'ip_address', p_ip,
      'user_agent', p_user_agent
    )
  );
END;
$$;