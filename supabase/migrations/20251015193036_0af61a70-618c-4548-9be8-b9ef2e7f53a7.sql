-- Tabel voor KBO verificatie logs
CREATE TABLE IF NOT EXISTS public.org_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_number TEXT NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verification_source TEXT DEFAULT 'KBO',
  status TEXT NOT NULL CHECK (status IN ('pass', 'warn', 'block')),
  kbo_data JSONB,
  comparison_result JSONB,
  user_input JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index voor snellere queries
CREATE INDEX idx_org_verifications_business_number ON public.org_verifications(business_number);
CREATE INDEX idx_org_verifications_organization_id ON public.org_verifications(organization_id);

-- RLS policies
ALTER TABLE public.org_verifications ENABLE ROW LEVEL SECURITY;

-- Admins kunnen alles zien
CREATE POLICY "Admins can view all verifications"
  ON public.org_verifications
  FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- System kan verificaties inserten
CREATE POLICY "System can insert verifications"
  ON public.org_verifications
  FOR INSERT
  WITH CHECK (true);