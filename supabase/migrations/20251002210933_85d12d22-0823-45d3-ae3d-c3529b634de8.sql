-- Create claim_status enum
CREATE TYPE claim_status AS ENUM (
  'API_PENDING',
  'API_APPROVED', 
  'API_REJECTED',
  'MANUAL_APPROVED',
  'MANUAL_REJECTED'
);

-- Create claim_source enum
CREATE TYPE claim_source AS ENUM ('API', 'MANUAL');

-- Create claims table
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL UNIQUE REFERENCES public.dossiers(id) ON DELETE CASCADE,
  policy_number TEXT NOT NULL,
  insurer_org_id UUID NOT NULL REFERENCES public.organizations(id),
  status claim_status NOT NULL DEFAULT 'API_PENDING',
  source claim_source NOT NULL DEFAULT 'API',
  override_reason TEXT,
  api_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on claims
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Claims policies
CREATE POLICY "Insurers can view their claims"
  ON public.claims FOR SELECT
  USING (
    insurer_org_id IN (
      SELECT organization_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'insurer'
    )
  );

CREATE POLICY "Insurers can update their claims"
  ON public.claims FOR UPDATE
  USING (
    insurer_org_id IN (
      SELECT organization_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'insurer'
    )
  );

CREATE POLICY "FD can view claims for their dossiers"
  ON public.claims FOR SELECT
  USING (
    has_role(auth.uid(), 'funeral_director') OR 
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "System can create claims"
  ON public.claims FOR INSERT
  WITH CHECK (true);

-- Create claim_actions audit table
CREATE TABLE IF NOT EXISTS public.claim_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('OVERRIDE_APPROVED', 'OVERRIDE_REJECTED', 'RESET_TO_API', 'API_SYNC')),
  reason TEXT,
  from_status claim_status,
  to_status claim_status,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on claim_actions
ALTER TABLE public.claim_actions ENABLE ROW LEVEL SECURITY;

-- Claim actions policies
CREATE POLICY "Users can view claim actions"
  ON public.claim_actions FOR SELECT
  USING (
    has_role(auth.uid(), 'funeral_director') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'insurer')
  );

CREATE POLICY "Users can insert claim actions"
  ON public.claim_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger to claims
CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing polis_checks to claims
INSERT INTO public.claims (dossier_id, policy_number, insurer_org_id, status, source)
SELECT 
  d.id,
  COALESCE(pc.polis_number, 'UNKNOWN'),
  COALESCE(d.insurer_org_id, (SELECT id FROM organizations WHERE type = 'INSURER' LIMIT 1)),
  CASE 
    WHEN pc.is_covered = true THEN 'API_APPROVED'::claim_status
    WHEN pc.is_covered = false THEN 'API_REJECTED'::claim_status
    ELSE 'API_PENDING'::claim_status
  END,
  'API'::claim_source
FROM dossiers d
LEFT JOIN polis_checks pc ON pc.dossier_id = d.id
WHERE NOT EXISTS (SELECT 1 FROM claims WHERE dossier_id = d.id)
ON CONFLICT (dossier_id) DO NOTHING;

-- Create dossier_events table for timeline
CREATE TABLE IF NOT EXISTS public.dossier_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on dossier_events
ALTER TABLE public.dossier_events ENABLE ROW LEVEL SECURITY;

-- Dossier events policies
CREATE POLICY "Users can view dossier events"
  ON public.dossier_events FOR SELECT
  USING (
    has_role(auth.uid(), 'funeral_director') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'insurer') OR
    has_role(auth.uid(), 'family')
  );

CREATE POLICY "System can create dossier events"
  ON public.dossier_events FOR INSERT
  WITH CHECK (true);