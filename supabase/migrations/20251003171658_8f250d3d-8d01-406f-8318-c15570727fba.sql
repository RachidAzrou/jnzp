-- Sessie & Wachtwoord Security Configuratie

-- 1. Sessie inactiviteit timeout (12 uur = 43200 seconden)
-- Dit wordt geconfigureerd via auth.config, maar we loggen het in onze audit
INSERT INTO audit_events (
  event_type, 
  description, 
  metadata
) VALUES (
  'SECURITY_CONFIG',
  'Session timeout configured to 12 hours',
  '{"session_timeout_hours": 12, "session_timeout_seconds": 43200}'::jsonb
);

-- 2. Wachtwoordbeleid functies
-- Functie om wachtwoordsterkte te checken
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  has_uppercase BOOLEAN;
  has_lowercase BOOLEAN;
  has_digit BOOLEAN;
  has_special BOOLEAN;
BEGIN
  -- Check minimum length (12 characters)
  IF LENGTH(password) < 12 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Password must be at least 12 characters long'
    );
  END IF;
  
  -- Check for uppercase letter
  has_uppercase := password ~ '[A-Z]';
  
  -- Check for lowercase letter
  has_lowercase := password ~ '[a-z]';
  
  -- Check for digit
  has_digit := password ~ '[0-9]';
  
  -- Check for special character
  has_special := password ~ '[!@#$%^&*(),.?":{}|<>]';
  
  -- Require at least 3 out of 4 character types
  IF (has_uppercase::int + has_lowercase::int + has_digit::int + has_special::int) < 3 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Password must contain at least 3 of: uppercase, lowercase, digit, special character'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'strength', 'strong'
  );
END;
$$;

-- 3. Tabel voor session tracking (inactiviteit monitoring)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 hours'),
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Index voor performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = true;

-- RLS policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage sessions"
  ON public.user_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Functie om verlopen sessies op te ruimen
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark sessions as inactive if no activity for 12 hours
  UPDATE public.user_sessions
  SET is_active = false
  WHERE is_active = true
    AND last_activity_at < NOW() - INTERVAL '12 hours';
    
  -- Delete sessions older than 30 days
  DELETE FROM public.user_sessions
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- 5. Functie om sessie activiteit bij te werken
CREATE OR REPLACE FUNCTION public.update_session_activity(p_session_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Check if session exists and is active
  SELECT * INTO v_session
  FROM public.user_sessions
  WHERE session_token = p_session_token
    AND is_active = true;
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Session not found or expired'
    );
  END IF;
  
  -- Check if session has been inactive for more than 12 hours
  IF v_session.last_activity_at < NOW() - INTERVAL '12 hours' THEN
    UPDATE public.user_sessions
    SET is_active = false
    WHERE id = v_session.id;
    
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Session expired due to inactivity'
    );
  END IF;
  
  -- Update last activity
  UPDATE public.user_sessions
  SET 
    last_activity_at = NOW(),
    expires_at = NOW() + INTERVAL '12 hours'
  WHERE id = v_session.id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'session_id', v_session.id,
    'user_id', v_session.user_id
  );
END;
$$;

-- 6. Audit log voor security configuratie
INSERT INTO audit_events (
  event_type,
  description,
  metadata
) VALUES (
  'SECURITY_CONFIG',
  'Password policy configured: min 12 chars, 3/4 character types required',
  '{"min_length": 12, "character_types_required": 3}'::jsonb
);