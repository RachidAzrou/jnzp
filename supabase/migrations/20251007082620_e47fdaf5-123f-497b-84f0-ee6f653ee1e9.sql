-- DROP ALL EXISTING POLICIES ON user_roles
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Only allowed roles can be assigned" ON user_roles;
DROP POLICY IF EXISTS "Only allowed roles can be updated" ON user_roles;
DROP POLICY IF EXISTS "Org admins can add team members" ON user_roles;
DROP POLICY IF EXISTS "Org admins can delete user_roles in their org" ON user_roles;
DROP POLICY IF EXISTS "Org admins can insert user_roles in their org" ON user_roles;
DROP POLICY IF EXISTS "Org admins can remove team members" ON user_roles;
DROP POLICY IF EXISTS "Org admins can select team members" ON user_roles;
DROP POLICY IF EXISTS "Org admins can update team members" ON user_roles;
DROP POLICY IF EXISTS "Org admins can update user_roles in their org" ON user_roles;
DROP POLICY IF EXISTS "Org admins can view user_roles in their org" ON user_roles;
DROP POLICY IF EXISTS "System can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "admins_manage_all" ON user_roles;
DROP POLICY IF EXISTS "admins_view_all" ON user_roles;
DROP POLICY IF EXISTS "insert_family_role" ON user_roles;
DROP POLICY IF EXISTS "org_admins_manage" ON user_roles;
DROP POLICY IF EXISTS "view_own_roles" ON user_roles;

-- Now create ONLY the safe policies that don't cause recursion
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