-- Fix infinite recursion: user_roles RLS policies must NOT use has_role()
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Org admins can manage their org roles" ON user_roles;
DROP POLICY IF EXISTS "Platform admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own family role" ON user_roles;

-- Create simple, direct policies without has_role()
-- Users can view their own roles (direct check)
CREATE POLICY "Users can view their own roles"
ON user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Platform admins can view all roles (direct check via metadata)
CREATE POLICY "Platform admins can view all roles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles 
    WHERE role IN ('platform_admin', 'admin')
  )
);

-- Platform admins can manage all roles
CREATE POLICY "Platform admins can manage all roles"
ON user_roles
FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles 
    WHERE role IN ('platform_admin', 'admin')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM user_roles 
    WHERE role IN ('platform_admin', 'admin')
  )
);

-- Org admins can manage roles in their organization
CREATE POLICY "Org admins can manage org roles"
ON user_roles
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'org_admin'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'org_admin'
  )
);

-- System can insert roles (for signup flow)
CREATE POLICY "System can insert roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'family');