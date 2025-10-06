-- Create security definer function to get user's organization IDs for a specific role
CREATE OR REPLACE FUNCTION public.get_user_org_ids_for_role(_user_id uuid, _role app_role)
RETURNS TABLE(organization_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = _role
    AND organization_id IS NOT NULL
$$;

-- Drop and recreate all policies without recursion
DROP POLICY IF EXISTS "Org admins can view user_roles in their org" ON user_roles;
DROP POLICY IF EXISTS "Org admins can insert user_roles in their org" ON user_roles;
DROP POLICY IF EXISTS "Org admins can update user_roles in their org" ON user_roles;
DROP POLICY IF EXISTS "Org admins can delete user_roles in their org" ON user_roles;

DROP POLICY IF EXISTS "Org admins can view invitations in their org" ON organization_invitations;
DROP POLICY IF EXISTS "Org admins can insert invitations in their org" ON organization_invitations;
DROP POLICY IF EXISTS "Org admins can update invitations in their org" ON organization_invitations;
DROP POLICY IF EXISTS "Org admins can delete invitations in their org" ON organization_invitations;

-- user_roles policies
CREATE POLICY "Org admins can view user_roles in their org"
ON user_roles
FOR SELECT
USING (
  (has_role(auth.uid(), 'org_admin'::app_role) AND 
   organization_id IN (SELECT get_user_org_ids_for_role(auth.uid(), 'org_admin'::app_role)))
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Org admins can insert user_roles in their org"
ON user_roles
FOR INSERT
WITH CHECK (
  ((has_role(auth.uid(), 'org_admin'::app_role) AND
    organization_id IN (SELECT get_user_org_ids_for_role(auth.uid(), 'org_admin'::app_role)) AND
    role != 'platform_admin'::app_role)
   OR has_role(auth.uid(), 'platform_admin'::app_role)
   OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Org admins can update user_roles in their org"
ON user_roles
FOR UPDATE
USING (
  (has_role(auth.uid(), 'org_admin'::app_role) AND
   organization_id IN (SELECT get_user_org_ids_for_role(auth.uid(), 'org_admin'::app_role)))
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  role != 'platform_admin'::app_role 
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);

CREATE POLICY "Org admins can delete user_roles in their org"
ON user_roles
FOR DELETE
USING (
  (has_role(auth.uid(), 'org_admin'::app_role) AND
   organization_id IN (SELECT get_user_org_ids_for_role(auth.uid(), 'org_admin'::app_role)))
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- organization_invitations policies
CREATE POLICY "Org admins can view invitations in their org"
ON organization_invitations
FOR SELECT
USING (
  (has_role(auth.uid(), 'org_admin'::app_role) AND
   organization_id IN (SELECT get_user_org_ids_for_role(auth.uid(), 'org_admin'::app_role)))
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Org admins can insert invitations in their org"
ON organization_invitations
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'org_admin'::app_role) AND
   organization_id IN (SELECT get_user_org_ids_for_role(auth.uid(), 'org_admin'::app_role)))
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Org admins can update invitations in their org"
ON organization_invitations
FOR UPDATE
USING (
  (has_role(auth.uid(), 'org_admin'::app_role) AND
   organization_id IN (SELECT get_user_org_ids_for_role(auth.uid(), 'org_admin'::app_role)))
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Org admins can delete invitations in their org"
ON organization_invitations
FOR DELETE
USING (
  (has_role(auth.uid(), 'org_admin'::app_role) AND
   organization_id IN (SELECT get_user_org_ids_for_role(auth.uid(), 'org_admin'::app_role)))
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);