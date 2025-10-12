-- Remove all triggers on case_events that might reference task_type
-- and fix the auto_complete_tasks function

-- Drop any remaining triggers on case_events
DROP TRIGGER IF EXISTS auto_complete_tasks_trigger ON case_events;
DROP TRIGGER IF EXISTS trigger_auto_complete ON case_events;

-- Update auto_complete_tasks function to remove case_events logic
-- This function should only handle documents, claims, invoices, and flights
CREATE OR REPLACE FUNCTION public.auto_complete_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-complete based on the trigger table
  IF TG_TABLE_NAME = 'documents' AND NEW.status = 'APPROVED' THEN
    -- Map document types to task types
    UPDATE kanban_tasks
    SET status = 'DONE', completed_at = NOW()
    WHERE dossier_id = NEW.dossier_id
      AND status != 'DONE'
      AND (
        (NEW.doc_type = 'OVERLIJDENSAKTE' AND task_type = 'INTAKE_DEATH_CERTIFICATE') OR
        (NEW.doc_type = 'ID_PASPOORT' AND task_type = 'INTAKE_ID_DOCUMENT') OR
        (NEW.doc_type = 'PASPOORT_OVERLEDENE' AND task_type = 'INTAKE_PASSPORT_DECEASED') OR
        (NEW.doc_type = 'BEGRAAFAKTE' AND task_type = 'SETTLE_BURIAL_CERTIFICATE')
      );
  
  ELSIF TG_TABLE_NAME = 'claims' AND NEW.status IN ('APPROVED', 'MANUAL_OVERRIDE') THEN
    UPDATE kanban_tasks
    SET status = 'DONE', completed_at = NOW()
    WHERE dossier_id = NEW.dossier_id
      AND status != 'DONE'
      AND task_type = 'VERIFY_INSURANCE';
  
  ELSIF TG_TABLE_NAME = 'invoices' AND NEW.status = 'SENT' THEN
    UPDATE kanban_tasks
    SET status = 'DONE', completed_at = NOW()
    WHERE dossier_id = NEW.dossier_id
      AND status != 'DONE'
      AND (
        (NEW.invoice_type = 'FD' AND task_type = 'SETTLE_FD_INVOICE') OR
        (NEW.invoice_type = 'WASPLAATS' AND task_type = 'SETTLE_MORTUARY_INVOICE')
      );
  
  ELSIF TG_TABLE_NAME = 'flights' AND NEW.air_waybill IS NOT NULL THEN
    -- Auto-complete flight booking task when AWB is added
    UPDATE kanban_tasks kt
    SET status = 'DONE', completed_at = NOW()
    FROM repatriations r
    WHERE kt.dossier_id = r.dossier_id
      AND r.id = NEW.repatriation_id
      AND kt.status != 'DONE'
      AND kt.task_type = 'EXECUTE_FLIGHT_BOOKING';
  END IF;
  
  RETURN NEW;
END;
$function$;