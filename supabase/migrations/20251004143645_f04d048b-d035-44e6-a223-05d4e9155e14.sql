-- Add organization_id to audit_events table
ALTER TABLE public.audit_events 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Create index for performance
CREATE INDEX idx_audit_events_dossier_org ON public.audit_events(dossier_id, organization_id);
CREATE INDEX idx_audit_events_created_at ON public.audit_events(created_at DESC);

-- Update log_admin_action function to include organization_id
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id uuid;
  v_user_role text;
  v_org_id uuid;
BEGIN
  -- Get user role and organization
  SELECT role::text, organization_id 
  INTO v_user_role, v_org_id
  FROM user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'platform_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'org_admin' THEN 3
    ELSE 4
  END
  LIMIT 1;

  INSERT INTO audit_events (
    user_id,
    actor_role,
    organization_id,
    event_type,
    target_type,
    target_id,
    reason,
    metadata,
    description
  ) VALUES (
    auth.uid(),
    v_user_role,
    v_org_id,
    p_action,
    p_target_type,
    p_target_id,
    p_reason,
    p_metadata,
    p_action || ' on ' || p_target_type
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- Update RLS policy to filter by organization
DROP POLICY IF EXISTS "Platform admins can view audit events" ON public.audit_events;

CREATE POLICY "Users can view their organization audit events"
ON public.audit_events
FOR SELECT
USING (
  -- Platform admins can see all
  has_role(auth.uid(), 'platform_admin') 
  OR has_role(auth.uid(), 'admin')
  OR 
  -- Others can only see their organization's events
  organization_id IN (
    SELECT organization_id 
    FROM user_roles 
    WHERE user_id = auth.uid()
  )
);