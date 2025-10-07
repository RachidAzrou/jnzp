-- Fix task_boards RLS policy om is_admin te gebruiken in plaats van org_admin rol
DROP POLICY IF EXISTS "Org admins can manage boards" ON public.task_boards;

CREATE POLICY "Org admins can manage boards"
ON public.task_boards
FOR ALL
USING (
  org_id IN (
    SELECT organization_id
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND is_admin = true
  )
);

-- Fix andere RLS policies die nog org_admin gebruiken
-- Check user_roles policies
DROP POLICY IF EXISTS "Org admins can manage roles" ON public.user_roles;
CREATE POLICY "Org admins can manage roles"
ON public.user_roles
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND is_admin = true
  )
);

-- Check profiles policies
DROP POLICY IF EXISTS "Org admins can manage profiles" ON public.profiles;
CREATE POLICY "Org admins can manage profiles"
ON public.profiles
FOR UPDATE
USING (
  id IN (
    SELECT ur.user_id
    FROM public.user_roles ur
    JOIN public.user_roles ur_admin ON ur.organization_id = ur_admin.organization_id
    WHERE ur_admin.user_id = auth.uid()
      AND ur_admin.is_admin = true
  )
);