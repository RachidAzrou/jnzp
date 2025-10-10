-- Add 2FA grace period tracking to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS two_fa_grace_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS two_fa_grace_granted_at TIMESTAMPTZ;

-- Create security function to check grace period (server-side)
CREATE OR REPLACE FUNCTION public.is_within_2fa_grace_period(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(two_fa_grace_expires_at > NOW(), false)
  FROM profiles
  WHERE id = p_user_id
$$;

-- Create function to set grace period
CREATE OR REPLACE FUNCTION public.set_2fa_grace_period(p_user_id UUID, p_hours INTEGER DEFAULT 24)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET two_fa_grace_expires_at = NOW() + (p_hours || ' hours')::INTERVAL,
      two_fa_grace_granted_at = NOW()
  WHERE id = p_user_id
$$;

-- Create function to clear grace period
CREATE OR REPLACE FUNCTION public.clear_2fa_grace_period(p_user_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET two_fa_grace_expires_at = NULL,
      two_fa_grace_granted_at = NULL
  WHERE id = p_user_id
$$;