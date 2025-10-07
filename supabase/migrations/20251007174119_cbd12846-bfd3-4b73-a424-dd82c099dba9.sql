-- Fix audit_events trigger to allow cascade deletes
-- First drop all triggers
DROP TRIGGER IF EXISTS prevent_audit_modification_trigger ON public.audit_events;
DROP TRIGGER IF EXISTS prevent_audit_update ON public.audit_events;
DROP TRIGGER IF EXISTS prevent_audit_delete ON public.audit_events;
DROP TRIGGER IF EXISTS prevent_audit_deletion_trigger ON public.audit_events;

-- Now drop the function (CASCADE will drop any remaining dependent triggers)
DROP FUNCTION IF EXISTS public.prevent_audit_modification() CASCADE;

-- Create new function that only prevents direct modifications
-- This allows CASCADE SET NULL and CASCADE DELETE to work
CREATE OR REPLACE FUNCTION public.prevent_audit_direct_modification()
RETURNS TRIGGER
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

-- Create trigger only for UPDATE (not DELETE)
-- This allows CASCADE DELETE to work when users are deleted
CREATE TRIGGER prevent_audit_modification_trigger
  BEFORE UPDATE ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_direct_modification();