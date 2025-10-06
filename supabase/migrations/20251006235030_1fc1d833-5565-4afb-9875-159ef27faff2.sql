-- Fix infinite recursion - drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Platform admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Platform admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Org admins can manage org roles" ON user_roles;
DROP POLICY IF EXISTS "System can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Org admins can manage org roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert family role" ON user_roles;

-- Create SECURITY DEFINER functions that bypass RLS
CREATE OR REPLACE FUNCTION public.is_admin_or_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role IN ('platform_admin', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin_for(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'org_admin'
  )
$$;

-- Create new policies using SECURITY DEFINER functions
CREATE POLICY "view_own_roles"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "admins_view_all"
ON user_roles
FOR SELECT
TO authenticated
USING (is_admin_or_platform_admin(auth.uid()));

CREATE POLICY "admins_manage_all"
ON user_roles
FOR ALL
TO authenticated
USING (is_admin_or_platform_admin(auth.uid()))
WITH CHECK (is_admin_or_platform_admin(auth.uid()));

CREATE POLICY "org_admins_manage"
ON user_roles
FOR ALL
TO authenticated
USING (
  organization_id IS NOT NULL 
  AND is_org_admin_for(auth.uid(), organization_id)
)
WITH CHECK (
  organization_id IS NOT NULL 
  AND is_org_admin_for(auth.uid(), organization_id)
);

CREATE POLICY "insert_family_role"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'family');