-- Update auto_complete_tasks to support flights table
CREATE OR REPLACE FUNCTION auto_complete_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  ELSIF TG_TABLE_NAME = 'case_events' THEN
    -- Auto-complete based on case event status
    IF NEW.status = 'PLANNED' THEN
      UPDATE kanban_tasks
      SET status = 'DONE', completed_at = NOW()
      WHERE dossier_id = NEW.dossier_id
        AND status != 'DONE'
        AND (
          (NEW.event_type = 'MORTUARY_SERVICE' AND task_type = 'PREP_MORTUARY') OR
          (NEW.event_type = 'MOSQUE_SERVICE' AND task_type = 'PREP_MOSQUE') OR
          (NEW.event_type = 'BURIAL' AND task_type = 'PREP_BURIAL') OR
          (NEW.event_type = 'PICKUP' AND task_type = 'PREP_TRANSPORT') OR
          (NEW.event_type = 'FLIGHT' AND task_type = 'PREP_FLIGHT_PROPOSAL') OR
          (NEW.event_type = 'EXPORT_CLEARANCE' AND task_type = 'PREP_EXPORT_CLEARANCE') OR
          (NEW.event_type = 'PARTNER_RECEIVING' AND task_type = 'PREP_RECEIVING_PARTNER')
        );
    ELSIF NEW.status = 'DONE' THEN
      UPDATE kanban_tasks
      SET status = 'DONE', completed_at = NOW()
      WHERE dossier_id = NEW.dossier_id
        AND status != 'DONE'
        AND (
          (NEW.event_type = 'PICKUP' AND task_type = 'EXECUTE_PICKUP') OR
          (NEW.event_type = 'MORTUARY_SERVICE' AND task_type = 'EXECUTE_MORTUARY') OR
          (NEW.event_type = 'MOSQUE_SERVICE' AND task_type = 'EXECUTE_MOSQUE') OR
          (NEW.event_type = 'BURIAL' AND task_type = 'EXECUTE_BURIAL') OR
          (NEW.event_type = 'EXPORT_CLEARANCE' AND task_type = 'EXECUTE_EXPORT') OR
          (NEW.event_type = 'FLIGHT' AND task_type = 'EXECUTE_FLIGHT_TRACKING') OR
          (NEW.event_type = 'PARTNER_RECEIVING' AND task_type = 'EXECUTE_PARTNER_HANDOVER')
        );
    END IF;
  
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
$$;