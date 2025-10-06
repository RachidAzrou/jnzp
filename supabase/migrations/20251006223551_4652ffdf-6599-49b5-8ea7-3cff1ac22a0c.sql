-- Allow platform_admin and admin to view all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO public
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'platform_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow platform_admin to view all user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO public
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'platform_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);