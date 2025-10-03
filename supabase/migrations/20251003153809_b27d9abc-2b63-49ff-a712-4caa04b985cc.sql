-- Table for tracking login attempts (brute-force protection)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON public.login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created ON public.login_attempts(ip_address, created_at);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only system can insert login attempts
CREATE POLICY "System can insert login attempts"
ON public.login_attempts
FOR INSERT
WITH CHECK (true);

-- Admins can view login attempts
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts
FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Table for 2FA settings
CREATE TABLE IF NOT EXISTS public.user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  totp_secret TEXT,
  totp_enabled BOOLEAN NOT NULL DEFAULT false,
  backup_phone TEXT,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  recovery_codes TEXT[], -- Encrypted recovery codes
  last_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own 2FA settings
CREATE POLICY "Users can view own 2FA settings"
ON public.user_2fa_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own 2FA settings
CREATE POLICY "Users can update own 2FA settings"
ON public.user_2fa_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can insert their own 2FA settings
CREATE POLICY "Users can insert own 2FA settings"
ON public.user_2fa_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to check if user requires 2FA
CREATE OR REPLACE FUNCTION public.user_requires_2fa(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Check if user has a professional role
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_roles.user_id = user_requires_2fa.user_id
    AND role IN ('funeral_director', 'org_admin', 'admin', 'platform_admin', 'wasplaats', 'mosque', 'insurer')
  LIMIT 1;
  
  -- If professional role found, 2FA is required
  RETURN user_role IS NOT NULL;
END;
$$;

-- Function to check if account is locked due to failed attempts
CREATE OR REPLACE FUNCTION public.is_account_locked(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_count INTEGER;
  last_attempt TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*), MAX(created_at)
  INTO failed_count, last_attempt
  FROM login_attempts
  WHERE email = p_email
    AND success = false
    AND created_at > now() - interval '15 minutes';
  
  -- Lock account if 5 or more failed attempts
  RETURN failed_count >= 5;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_user_2fa_settings_updated_at
  BEFORE UPDATE ON public.user_2fa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();