-- Immutable Audit Log
-- Append-only design with strict RLS

-- Drop existing policies if they allow UPDATE/DELETE
DROP POLICY IF EXISTS "Admins can insert audit events" ON public.audit_events;
DROP POLICY IF EXISTS "Platform admins can view all audit events" ON public.audit_events;

-- Recreate RLS policies for immutability
CREATE POLICY "System can insert audit events"
  ON public.audit_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Platform admins can view audit events"
  ON public.audit_events
  FOR SELECT
  USING (
    has_role(auth.uid(), 'platform_admin') OR 
    has_role(auth.uid(), 'admin')
  );

-- Prevent UPDATE and DELETE entirely (no policies = no access)
-- RLS is enabled, so without explicit policies, UPDATE/DELETE are blocked

-- Create trigger to prevent any modifications
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable and cannot be modified or deleted';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prevent_audit_update ON public.audit_events;
CREATE TRIGGER prevent_audit_update
  BEFORE UPDATE ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

DROP TRIGGER IF EXISTS prevent_audit_delete ON public.audit_events;
CREATE TRIGGER prevent_audit_delete
  BEFORE DELETE ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- Create a view for audit log queries with filters
CREATE OR REPLACE VIEW public.audit_log_view AS
SELECT 
  id,
  user_id,
  actor_role,
  event_type,
  target_type,
  target_id,
  description,
  reason,
  metadata,
  payload_diff,
  dossier_id,
  created_at
FROM audit_events
ORDER BY created_at DESC;

-- Grant access to view
GRANT SELECT ON public.audit_log_view TO authenticated;

-- RLS on view (inherits from table)
ALTER VIEW public.audit_log_view SET (security_invoker = on);

-- Auditlog entry (meta!)
INSERT INTO audit_events (
  event_type,
  description,
  metadata
) VALUES (
  'SECURITY_CONFIG',
  'Audit log immutability configured',
  jsonb_build_object(
    'append_only', true,
    'triggers', ARRAY['prevent_update', 'prevent_delete'],
    'timestamp', NOW()
  )
);