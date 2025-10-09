-- Fix user_requires_2fa function to use 'mortuarium' instead of 'wasplaats'
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
    AND role IN ('funeral_director', 'org_admin', 'admin', 'platform_admin', 'mortuarium', 'mosque', 'insurer')
  LIMIT 1;
  
  -- If professional role found, 2FA is required
  RETURN user_role IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_requires_2fa(UUID) TO authenticated, anon;