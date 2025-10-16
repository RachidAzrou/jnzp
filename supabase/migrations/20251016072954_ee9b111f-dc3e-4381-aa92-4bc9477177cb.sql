-- Fix all remaining 'ARCHIVED' references in database functions to use 'CLOSED' instead

-- 1. Fix archive_dossier_tasks() function (currently checks for ARCHIVED status)
DROP FUNCTION IF EXISTS archive_dossier_tasks() CASCADE;

CREATE OR REPLACE FUNCTION archive_dossier_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- When dossier status changes to CLOSED, archive all its tasks immediately
  IF NEW.status = 'CLOSED' AND (OLD.status IS DISTINCT FROM 'CLOSED') THEN
    UPDATE kanban_tasks
    SET archived_at = NOW(),
        is_archived = true
    WHERE dossier_id = NEW.id
      AND archived_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_archive_dossier_tasks ON public.dossiers;
CREATE TRIGGER trigger_archive_dossier_tasks
  AFTER UPDATE ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION archive_dossier_tasks();