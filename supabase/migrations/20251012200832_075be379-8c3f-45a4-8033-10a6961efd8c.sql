-- Verwijder de oude trigger en functie met CASCADE
DROP TRIGGER IF EXISTS trigger_archive_dossier_tasks ON dossiers CASCADE;
DROP TRIGGER IF EXISTS archive_tasks_on_dossier_archive ON dossiers CASCADE;
DROP FUNCTION IF EXISTS archive_dossier_tasks() CASCADE;

-- Map alle oude status waarden naar de nieuwe simple_dossier_status enum
UPDATE dossiers SET status = 'CREATED'::simple_dossier_status 
WHERE status::text = 'CREATED';

UPDATE dossiers SET status = 'IN_PROGRESS'::simple_dossier_status 
WHERE status::text IN ('INTAKE_IN_PROGRESS', 'DOCS_PENDING', 'DOCS_IN_REVIEW', 'PLANNING_IN_PROGRESS', 'EXECUTION_IN_PROGRESS');

UPDATE dossiers SET status = 'UNDER_REVIEW'::simple_dossier_status 
WHERE status::text = 'AWAITING_APPROVAL';

UPDATE dossiers SET status = 'COMPLETED'::simple_dossier_status 
WHERE status::text IN ('COMPLETED', 'READY_FOR_SETTLEMENT');

UPDATE dossiers SET status = 'CLOSED'::simple_dossier_status 
WHERE status::text IN ('ARCHIVED', 'SETTLEMENT');

-- Maak nieuwe trigger functie met CLOSED status
CREATE OR REPLACE FUNCTION archive_dossier_tasks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CLOSED' AND (OLD.status IS DISTINCT FROM 'CLOSED') THEN
    UPDATE kanban_tasks
    SET status = 'DONE'
    WHERE dossier_id = NEW.id
      AND status != 'DONE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Heractiveer de trigger
CREATE TRIGGER trigger_archive_dossier_tasks
  BEFORE UPDATE ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION archive_dossier_tasks();