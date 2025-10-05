-- Update RLS policy to allow wasplaats (mortuarium) to create dossiers
DROP POLICY IF EXISTS "Funeral directors can create dossiers" ON public.dossiers;

CREATE POLICY "FD and Wasplaats can create dossiers" ON public.dossiers
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'funeral_director'::app_role) OR
  has_role(auth.uid(), 'wasplaats'::app_role)
);

-- Also update the SELECT policy to allow wasplaats to view dossiers
DROP POLICY IF EXISTS "Funeral directors can view their assigned dossiers" ON public.dossiers;

CREATE POLICY "FD and Wasplaats can view dossiers" ON public.dossiers
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'funeral_director'::app_role) OR
  has_role(auth.uid(), 'wasplaats'::app_role)
);

-- Update the UPDATE policy to allow wasplaats to update dossiers
DROP POLICY IF EXISTS "Funeral directors can update dossiers" ON public.dossiers;

CREATE POLICY "FD and Wasplaats can update dossiers" ON public.dossiers
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'funeral_director'::app_role) OR
  has_role(auth.uid(), 'wasplaats'::app_role)
);