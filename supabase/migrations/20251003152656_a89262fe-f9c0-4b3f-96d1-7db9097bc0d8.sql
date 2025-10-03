-- Prevent deletion of last org_admin
CREATE OR REPLACE FUNCTION prevent_last_admin_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Only check if deleting an org_admin
  IF OLD.role = 'org_admin' THEN
    -- Count remaining org_admins for this organization
    SELECT COUNT(*) INTO admin_count
    FROM user_roles
    WHERE organization_id = OLD.organization_id
      AND role = 'org_admin'
      AND user_id != OLD.user_id;
    
    -- Prevent deletion if this is the last admin
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last org_admin. Please assign another user as org_admin first.';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger to prevent last admin deletion
DROP TRIGGER IF EXISTS prevent_last_admin_deletion_trigger ON user_roles;
CREATE TRIGGER prevent_last_admin_deletion_trigger
  BEFORE DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_admin_deletion();

-- Prevent role change from org_admin if last admin
CREATE OR REPLACE FUNCTION prevent_last_admin_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Only check if changing FROM org_admin TO something else
  IF OLD.role = 'org_admin' AND NEW.role != 'org_admin' THEN
    -- Count remaining org_admins for this organization
    SELECT COUNT(*) INTO admin_count
    FROM user_roles
    WHERE organization_id = OLD.organization_id
      AND role = 'org_admin'
      AND user_id != OLD.user_id;
    
    -- Prevent role change if this is the last admin
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot change role of the last org_admin. Please assign another user as org_admin first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to prevent last admin role change
DROP TRIGGER IF EXISTS prevent_last_admin_role_change_trigger ON user_roles;
CREATE TRIGGER prevent_last_admin_role_change_trigger
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_admin_role_change();