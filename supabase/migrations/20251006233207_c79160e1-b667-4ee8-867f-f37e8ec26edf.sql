-- Drop existing broken policies on user_roles
DROP POLICY IF EXISTS "ur_select_org" ON user_roles;
DROP POLICY IF EXISTS "ur_mutate_org" ON user_roles;
DROP POLICY IF EXISTS "ur_update_org" ON user_roles;
DROP POLICY IF EXISTS "ur_delete_org" ON user_roles;

-- Drop existing broken policies on organization_invitations
DROP POLICY IF EXISTS "inv_select_org" ON organization_invitations;
DROP POLICY IF EXISTS "inv_insert_org" ON organization_invitations;
DROP POLICY IF EXISTS "inv_update_org" ON organization_invitations;
DROP POLICY IF EXISTS "inv_delete_org" ON organization_invitations;

-- Create correct policies for user_roles using has_role() function
CREATE POLICY "Org admins can view user_roles in their org"
ON user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'org_admin'::app_role) AND
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'org_admin'::app_role
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Org admins can insert user_roles in their org"
ON user_roles
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'org_admin'::app_role) AND
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'org_admin'::app_role
  ) AND
  role != 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Org admins can update user_roles in their org"
ON user_roles
FOR UPDATE
USING (
  has_role(auth.uid(), 'org_admin'::app_role) AND
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'org_admin'::app_role
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  role != 'platform_admin'::app_role OR has_role(auth.uid(), 'platform_admin'::app_role)
);

CREATE POLICY "Org admins can delete user_roles in their org"
ON user_roles
FOR DELETE
USING (
  has_role(auth.uid(), 'org_admin'::app_role) AND
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'org_admin'::app_role
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create correct policies for organization_invitations
CREATE POLICY "Org admins can view invitations in their org"
ON organization_invitations
FOR SELECT
USING (
  has_role(auth.uid(), 'org_admin'::app_role) AND
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'org_admin'::app_role
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Org admins can insert invitations in their org"
ON organization_invitations
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'org_admin'::app_role) AND
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'org_admin'::app_role
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Org admins can update invitations in their org"
ON organization_invitations
FOR UPDATE
USING (
  has_role(auth.uid(), 'org_admin'::app_role) AND
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'org_admin'::app_role
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Org admins can delete invitations in their org"
ON organization_invitations
FOR DELETE
USING (
  has_role(auth.uid(), 'org_admin'::app_role) AND
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'org_admin'::app_role
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);