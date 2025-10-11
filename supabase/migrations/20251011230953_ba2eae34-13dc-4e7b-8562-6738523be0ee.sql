-- Fix log_task_to_dossier_timeline - use labels array instead of non-existent task_type column
DROP FUNCTION IF EXISTS log_task_to_dossier_timeline() CASCADE;

CREATE OR REPLACE FUNCTION log_task_to_dossier_timeline()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.dossier_id IS NOT NULL THEN
    INSERT INTO dossier_events (dossier_id, event_type, event_description, created_by, metadata)
    VALUES (
      NEW.dossier_id,
      'TASK_CREATED',
      'Taak aangemaakt: ' || NEW.title,
      COALESCE(NEW.created_by, auth.uid()),
      jsonb_build_object(
        'task_id', NEW.id, 
        'task_type', CASE WHEN array_length(NEW.labels, 1) > 0 THEN NEW.labels[1] ELSE NULL END
      )
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.dossier_id IS NOT NULL THEN
    IF OLD.status != NEW.status AND NEW.status = 'DONE' THEN
      INSERT INTO dossier_events (dossier_id, event_type, event_description, created_by, metadata)
      VALUES (
        NEW.dossier_id,
        'TASK_COMPLETED',
        'Taak afgerond: ' || NEW.title,
        auth.uid(),
        jsonb_build_object(
          'task_id', NEW.id, 
          'task_type', CASE WHEN array_length(NEW.labels, 1) > 0 THEN NEW.labels[1] ELSE NULL END
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_log_task_timeline ON kanban_tasks;

CREATE TRIGGER trg_log_task_timeline
AFTER INSERT OR UPDATE ON kanban_tasks
FOR EACH ROW
WHEN (NEW.dossier_id IS NOT NULL)
EXECUTE FUNCTION log_task_to_dossier_timeline();

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';