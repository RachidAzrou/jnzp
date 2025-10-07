-- Stap 1: Drop foreign key constraint tijdelijk
ALTER TABLE public.audit_events 
DROP CONSTRAINT IF EXISTS audit_events_user_id_fkey;

-- Stap 2: Drop triggers
DROP TRIGGER IF EXISTS prevent_last_admin_role_change_trigger ON public.user_roles;
DROP TRIGGER IF EXISTS prevent_last_admin_deletion_trigger ON public.user_roles;
DROP TRIGGER IF EXISTS audit_role_changes_trigger ON public.user_roles;

-- Stap 3: Cleanup orphaned user_roles records
DELETE FROM public.user_roles WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Stap 4: Cleanup orphaned audit_events records
UPDATE public.audit_events 
SET user_id = NULL 
WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);

-- Stap 5: Zet is_admin = true voor admin@arrahma.be
UPDATE public.user_roles SET is_admin = true 
WHERE user_id = '58a2b01e-44de-4a6f-be43-2a12039eefb7' 
  AND organization_id = 'f4f2939d-792c-4796-84b4-750b8f7d9dfd'
  AND role = 'funeral_director';

-- Stap 6: Migreer andere org_admin rechten
UPDATE public.user_roles ur1 SET is_admin = true 
FROM public.user_roles ur2
WHERE ur1.user_id = ur2.user_id
  AND ur1.organization_id = ur2.organization_id
  AND ur2.role = 'org_admin'
  AND ur1.role IN ('funeral_director', 'mosque', 'wasplaats', 'insurer');

-- Stap 7: Verwijder org_admin rollen
DELETE FROM public.user_roles WHERE role = 'org_admin';

-- Stap 8: Voeg foreign key constraint weer toe (met ON DELETE SET NULL)
ALTER TABLE public.audit_events 
ADD CONSTRAINT audit_events_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Stap 9: Herstel audit trigger
CREATE TRIGGER audit_role_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION audit_role_changes();