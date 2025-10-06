-- Add is_active column to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create organization_invitations table
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_role app_role NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED')),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  accepted_at timestamptz,
  UNIQUE (organization_id, email, status)
);

-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles

-- Org admins can select user_roles in their org
DROP POLICY IF EXISTS "Org admins can select team members" ON public.user_roles;
CREATE POLICY "Org admins can select team members"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles me
    WHERE me.user_id = auth.uid()
      AND me.role = 'org_admin'
      AND me.organization_id = user_roles.organization_id
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Org admins can insert user_roles in their org (but not platform_admin)
DROP POLICY IF EXISTS "Org admins can add team members" ON public.user_roles;
CREATE POLICY "Org admins can add team members"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles me
    WHERE me.user_id = auth.uid()
      AND me.role = 'org_admin'
      AND me.organization_id = user_roles.organization_id
  )
  AND role != 'platform_admin'
);

-- Org admins can update user_roles in their org
DROP POLICY IF EXISTS "Org admins can update team members" ON public.user_roles;
CREATE POLICY "Org admins can update team members"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles me
    WHERE me.user_id = auth.uid()
      AND me.role = 'org_admin'
      AND me.organization_id = user_roles.organization_id
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (role != 'platform_admin');

-- Org admins can delete user_roles in their org
DROP POLICY IF EXISTS "Org admins can remove team members" ON public.user_roles;
CREATE POLICY "Org admins can remove team members"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles me
    WHERE me.user_id = auth.uid()
      AND me.role = 'org_admin'
      AND me.organization_id = user_roles.organization_id
  )
);

-- RLS Policies for organization_invitations

-- Org admins can select invitations in their org
CREATE POLICY "Org admins can view invitations"
ON public.organization_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles me
    WHERE me.user_id = auth.uid()
      AND me.role = 'org_admin'
      AND me.organization_id = organization_invitations.organization_id
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Org admins can create invitations in their org
CREATE POLICY "Org admins can create invitations"
ON public.organization_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles me
    WHERE me.user_id = auth.uid()
      AND me.role = 'org_admin'
      AND me.organization_id = organization_invitations.organization_id
  )
);

-- Org admins can update invitations in their org
CREATE POLICY "Org admins can update invitations"
ON public.organization_invitations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles me
    WHERE me.user_id = auth.uid()
      AND me.role = 'org_admin'
      AND me.organization_id = organization_invitations.organization_id
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_status ON public.organization_invitations(organization_id, status);

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  token text;
  exists boolean;
BEGIN
  LOOP
    token := encode(gen_random_bytes(32), 'base64');
    token := replace(replace(replace(token, '/', '_'), '+', '-'), '=', '');
    SELECT EXISTS(SELECT 1 FROM organization_invitations WHERE organization_invitations.token = token) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN token;
END;
$$;