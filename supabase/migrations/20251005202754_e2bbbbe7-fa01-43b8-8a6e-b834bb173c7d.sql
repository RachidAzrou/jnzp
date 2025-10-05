-- CRITICAL SECURITY FIX: Isolate dossiers by organization
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "FD and Wasplaats can view dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "FD and Wasplaats can update dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "FD and Wasplaats can create dossiers" ON public.dossiers;

-- Create new policies that filter by organization_id
CREATE POLICY "FD can view own organization dossiers" 
ON public.dossiers
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'funeral_director'::app_role) AND 
   assigned_fd_org_id IN (
     SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
   )) OR
  (has_role(auth.uid(), 'wasplaats'::app_role))
);

CREATE POLICY "FD can update own organization dossiers" 
ON public.dossiers
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'funeral_director'::app_role) AND 
   assigned_fd_org_id IN (
     SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
   )) OR
  (has_role(auth.uid(), 'wasplaats'::app_role))
);

CREATE POLICY "FD can create dossiers for own organization" 
ON public.dossiers
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'funeral_director'::app_role) AND 
   assigned_fd_org_id IN (
     SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
   )) OR
  (has_role(auth.uid(), 'wasplaats'::app_role))
);