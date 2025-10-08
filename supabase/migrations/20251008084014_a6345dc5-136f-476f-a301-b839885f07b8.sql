-- Drop old trigger function that used net.http_post (doesn't work)
DROP TRIGGER IF EXISTS seed_tasks_on_dossier_insert ON dossiers;
DROP TRIGGER IF EXISTS seed_tasks_on_dossier_status_change ON dossiers;
DROP FUNCTION IF EXISTS trigger_seed_tasks();

-- Create auto-complete trigger function
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
          (NEW.event_type = 'PICKUP' AND task_type = 'PREP_TRANSPORT')
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
          (NEW.event_type = 'BURIAL' AND task_type = 'EXECUTE_BURIAL')
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for auto-completion on documents
CREATE TRIGGER auto_complete_tasks_from_documents
  AFTER INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_tasks();

-- Create triggers for auto-completion on case_events
CREATE TRIGGER auto_complete_tasks_from_case_events
  AFTER INSERT OR UPDATE ON case_events
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_tasks();

-- Create triggers for auto-completion on claims
CREATE TRIGGER auto_complete_tasks_from_claims
  AFTER INSERT OR UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_tasks();

-- Create triggers for auto-completion on invoices
CREATE TRIGGER auto_complete_tasks_from_invoices
  AFTER INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_tasks();