-- Fix task_boards RLS policies om infinite recursion te voorkomen

-- Drop bestaande policies
DROP POLICY IF EXISTS "Org admins can manage boards" ON public.task_boards;
DROP POLICY IF EXISTS "Org members can view their boards" ON public.task_boards;

-- Maak veilige policies met bestaande security definer functies
CREATE POLICY "Org members can view their task boards"
ON public.task_boards
FOR SELECT
USING (
  public.user_in_org(auth.uid(), org_id)
);

CREATE POLICY "Org admins can manage task boards"
ON public.task_boards
FOR ALL
USING (
  public.is_org_admin(auth.uid(), org_id)
  OR public.has_role(auth.uid(), 'platform_admin')
);