-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
DROP FUNCTION IF EXISTS public.create_organization_onboarding();

-- Create organization_onboarding table for all organizations
CREATE TABLE IF NOT EXISTS public.organization_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  step_basic_info BOOLEAN NOT NULL DEFAULT false,
  step_team_setup BOOLEAN NOT NULL DEFAULT false,
  step_integrations BOOLEAN NOT NULL DEFAULT false,
  step_preferences BOOLEAN NOT NULL DEFAULT false,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.organization_onboarding ENABLE ROW LEVEL SECURITY;

-- Allow organization members to view their organization's onboarding
CREATE POLICY "Org members can view their onboarding"
ON public.organization_onboarding
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  )
);

-- Allow organization members to update their organization's onboarding
CREATE POLICY "Org members can update their onboarding"
ON public.organization_onboarding
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  )
);

-- Create trigger to auto-create onboarding record when organization is created
CREATE OR REPLACE FUNCTION public.create_organization_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_onboarding (organization_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_organization_onboarding();

-- Create onboarding records for existing organizations
INSERT INTO public.organization_onboarding (organization_id)
SELECT id FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;

-- Add updated_at trigger
CREATE TRIGGER update_organization_onboarding_updated_at
  BEFORE UPDATE ON public.organization_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();