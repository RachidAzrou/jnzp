-- Update RLS policies for insurer role access

-- Dossiers: Insurers can view dossiers from their own organization
CREATE POLICY "Insurers can view their organization's dossiers"
ON public.dossiers
FOR SELECT
USING (
  has_role(auth.uid(), 'insurer'::app_role) 
  AND insurer_org_id IN (
    SELECT organization_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'insurer'::app_role
  )
);

-- Documents: Insurers can view documents for accessible dossiers
CREATE POLICY "Insurers can view documents for their dossiers"
ON public.documents
FOR SELECT
USING (
  has_role(auth.uid(), 'insurer'::app_role)
  AND dossier_id IN (
    SELECT id FROM public.dossiers 
    WHERE insurer_org_id IN (
      SELECT organization_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'insurer'::app_role
    )
  )
);

-- Documents: Insurers can update documents (for review/comments) - optional feature
CREATE POLICY "Insurers can update documents for review"
ON public.documents
FOR UPDATE
USING (
  has_role(auth.uid(), 'insurer'::app_role)
  AND dossier_id IN (
    SELECT id FROM public.dossiers 
    WHERE insurer_org_id IN (
      SELECT organization_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'insurer'::app_role
    )
  )
);

-- Polis checks: Insurers can view polis checks for their dossiers
CREATE POLICY "Insurers can view polis checks"
ON public.polis_checks
FOR SELECT
USING (
  has_role(auth.uid(), 'insurer'::app_role)
  AND dossier_id IN (
    SELECT id FROM public.dossiers 
    WHERE insurer_org_id IN (
      SELECT organization_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'insurer'::app_role
    )
  )
);

-- Wash services: Insurers can view wash services for their dossiers
CREATE POLICY "Insurers can view wash services"
ON public.wash_services
FOR SELECT
USING (
  has_role(auth.uid(), 'insurer'::app_role)
  AND dossier_id IN (
    SELECT id FROM public.dossiers 
    WHERE insurer_org_id IN (
      SELECT organization_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'insurer'::app_role
    )
  )
);

-- Mosque services: Insurers can view mosque services for their dossiers
CREATE POLICY "Insurers can view mosque services"
ON public.mosque_services
FOR SELECT
USING (
  has_role(auth.uid(), 'insurer'::app_role)
  AND dossier_id IN (
    SELECT id FROM public.dossiers 
    WHERE insurer_org_id IN (
      SELECT organization_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'insurer'::app_role
    )
  )
);

-- Repatriations: Insurers can view repatriations for their dossiers
CREATE POLICY "Insurers can view repatriations"
ON public.repatriations
FOR SELECT
USING (
  has_role(auth.uid(), 'insurer'::app_role)
  AND dossier_id IN (
    SELECT id FROM public.dossiers 
    WHERE insurer_org_id IN (
      SELECT organization_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'insurer'::app_role
    )
  )
);

-- Flights: Insurers can view flights for their dossiers
CREATE POLICY "Insurers can view flights"
ON public.flights
FOR SELECT
USING (
  has_role(auth.uid(), 'insurer'::app_role)
  AND repatriation_id IN (
    SELECT id FROM public.repatriations
    WHERE dossier_id IN (
      SELECT id FROM public.dossiers 
      WHERE insurer_org_id IN (
        SELECT organization_id 
        FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'insurer'::app_role
      )
    )
  )
);

-- Invoices: Insurers can view invoices (read-only)
CREATE POLICY "Insurers can view invoices"
ON public.invoices
FOR SELECT
USING (
  has_role(auth.uid(), 'insurer'::app_role)
  AND dossier_id IN (
    SELECT id FROM public.dossiers 
    WHERE insurer_org_id IN (
      SELECT organization_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'insurer'::app_role
    )
  )
);