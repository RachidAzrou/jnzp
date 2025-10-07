-- Drop the trigger that prevents audit event modifications completely
DROP TRIGGER IF EXISTS prevent_audit_modification_trigger ON audit_events;

-- Recreate it to only prevent direct UPDATE/DELETE, but allow cascading SET NULL
CREATE OR REPLACE FUNCTION public.prevent_audit_direct_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow the operation if it's coming from a CASCADE SET NULL (user_id becomes NULL)
  IF TG_OP = 'UPDATE' AND NEW.user_id IS NULL AND OLD.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Prevent all other modifications
  RAISE EXCEPTION 'Audit events are immutable and cannot be modified or deleted directly';
  RETURN NULL;
END;
$$;

-- Apply trigger for UPDATE and DELETE operations
CREATE TRIGGER prevent_audit_modification_trigger
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_direct_modification();