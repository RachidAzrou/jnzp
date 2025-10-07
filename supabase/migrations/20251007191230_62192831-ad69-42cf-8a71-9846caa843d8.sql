-- Update RLS policies voor organization_invitations
DROP POLICY IF EXISTS "Org admins can delete invitations" ON public.organization_invitations;
CREATE POLICY "Org admins can delete invitations" 
ON public.organization_invitations 
FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND is_admin = true
  )
);

DROP POLICY IF EXISTS "Org admins can insert invitations" ON public.organization_invitations;
CREATE POLICY "Org admins can insert invitations" 
ON public.organization_invitations 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND is_admin = true
  )
);

DROP POLICY IF EXISTS "Org admins can update invitations" ON public.organization_invitations;
CREATE POLICY "Org admins can update invitations" 
ON public.organization_invitations 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND is_admin = true
  )
);

-- Update helper function
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND is_admin = true
  )
$$;

-- Nieuwe triggers voor admin bescherming
CREATE OR REPLACE FUNCTION public.prevent_last_admin_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  IF OLD.is_admin = true AND NEW.is_admin = false THEN
    SELECT COUNT(*) INTO admin_count
    FROM user_roles
    WHERE organization_id = OLD.organization_id
      AND is_admin = true
      AND user_id != OLD.user_id;
    
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove admin rights from the last admin. Please assign another user as admin first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_last_admin_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  IF OLD.is_admin = true THEN
    SELECT COUNT(*) INTO admin_count
    FROM user_roles
    WHERE organization_id = OLD.organization_id
      AND is_admin = true
      AND user_id != OLD.user_id;
    
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last admin. Please assign another user as admin first.';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_last_admin_role_change_trigger
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_admin_role_change();

CREATE TRIGGER prevent_last_admin_deletion_trigger
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_admin_deletion();