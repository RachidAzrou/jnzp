-- Rate Limiting & Abuse Prevention

-- 1. Tabel voor rate limiting tracking
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user_id
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Index voor performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON public.rate_limit_tracking(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON public.rate_limit_tracking(window_start);

-- RLS policies
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits"
  ON public.rate_limit_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Functie om rate limit te checken
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_window_end TIMESTAMPTZ;
BEGIN
  -- Calculate current window start (rounded to the hour/minute)
  v_window_start := date_trunc('minute', NOW()) - (EXTRACT(MINUTE FROM NOW())::INTEGER % p_window_minutes || ' minutes')::INTERVAL;
  v_window_end := v_window_start + (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get current count for this identifier and endpoint in the window
  SELECT COALESCE(SUM(request_count), 0)
  INTO v_current_count
  FROM public.rate_limit_tracking
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  -- Check if limit exceeded
  IF v_current_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Rate limit exceeded',
      'retry_after', EXTRACT(EPOCH FROM (v_window_end - NOW()))::INTEGER,
      'current_count', v_current_count,
      'max_requests', p_max_requests
    );
  END IF;
  
  -- Increment counter (upsert)
  INSERT INTO public.rate_limit_tracking (identifier, endpoint, window_start, request_count)
  VALUES (p_identifier, p_endpoint, v_window_start, 1)
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET request_count = rate_limit_tracking.request_count + 1;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_current_count + 1,
    'max_requests', p_max_requests,
    'window_end', v_window_end
  );
END;
$$;

-- 3. Functie om oude rate limit records op te ruimen
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete rate limit records older than 24 hours
  DELETE FROM public.rate_limit_tracking
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$;

-- 4. Tabel voor captcha verificatie tracking
CREATE TABLE IF NOT EXISTS public.captcha_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  identifier TEXT NOT NULL, -- IP or email
  endpoint TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  used BOOLEAN NOT NULL DEFAULT false
);

-- Index voor performance
CREATE INDEX IF NOT EXISTS idx_captcha_token ON public.captcha_verifications(token);
CREATE INDEX IF NOT EXISTS idx_captcha_expires ON public.captcha_verifications(expires_at);

-- RLS policies
ALTER TABLE public.captcha_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage captcha"
  ON public.captcha_verifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Functie om captcha te verifiëren
CREATE OR REPLACE FUNCTION public.verify_captcha(
  p_token TEXT,
  p_identifier TEXT,
  p_endpoint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_captcha RECORD;
BEGIN
  -- Check if captcha token exists and is valid
  SELECT * INTO v_captcha
  FROM public.captcha_verifications
  WHERE token = p_token
    AND identifier = p_identifier
    AND endpoint = p_endpoint
    AND NOT used
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or expired captcha token'
    );
  END IF;
  
  -- Mark as used
  UPDATE public.captcha_verifications
  SET used = true
  WHERE id = v_captcha.id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'verified_at', v_captcha.verified_at
  );
END;
$$;

-- 6. Functie om captcha tokens op te ruimen
CREATE OR REPLACE FUNCTION public.cleanup_expired_captcha()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired or used captcha tokens older than 1 hour
  DELETE FROM public.captcha_verifications
  WHERE expires_at < NOW() - INTERVAL '1 hour'
     OR (used = true AND verified_at < NOW() - INTERVAL '1 hour');
END;
$$;

-- 7. Enhanced login attempts tracking met progressive delay
CREATE OR REPLACE FUNCTION public.calculate_login_delay(p_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_attempts INTEGER;
  v_delay_seconds INTEGER;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*) INTO v_failed_attempts
  FROM login_attempts
  WHERE email = p_email
    AND success = false
    AND created_at > NOW() - INTERVAL '15 minutes';
  
  -- Progressive delay:
  -- 0 fails = 0 seconds
  -- 1-2 fails = 2 seconds
  -- 3-4 fails = 5 seconds
  -- 5+ fails = 30 seconds (account locked)
  IF v_failed_attempts = 0 THEN
    v_delay_seconds := 0;
  ELSIF v_failed_attempts <= 2 THEN
    v_delay_seconds := 2;
  ELSIF v_failed_attempts <= 4 THEN
    v_delay_seconds := 5;
  ELSE
    v_delay_seconds := 30;
  END IF;
  
  RETURN v_delay_seconds;
END;
$$;

-- 8. Audit log entry
INSERT INTO audit_events (
  event_type,
  description,
  metadata
) VALUES (
  'SECURITY_CONFIG',
  'Rate limiting and captcha system configured',
  '{"rate_limits": {"login": "5/15min", "password_reset": "3/hour", "api": "100/hour"}, "captcha_required_after": 3}'::jsonb
);