-- Fix: Remove ALL old triggers and recreate with correct Dutch statuses

-- Step 1: Drop all related triggers
DROP TRIGGER IF EXISTS trigger_archive_dossier_tasks ON public.dossiers;

-- Step 2: Fix any existing tasks with wrong status (safety measure)
UPDATE kanban_tasks 
SET status = 'AFGEROND' 
WHERE status = 'DONE';

-- Step 3: Recreate the archive function with CORRECT status
CREATE OR REPLACE FUNCTION archive_dossier_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When dossier is set to CLOSED, mark all tasks as AFGEROND
  IF NEW.status = 'CLOSED' AND (OLD.status IS DISTINCT FROM 'CLOSED') THEN
    UPDATE kanban_tasks
    SET status = 'AFGEROND'
    WHERE dossier_id = NEW.id
      AND status != 'AFGEROND';
  END IF;
  RETURN NEW;
END;
$$;

-- Step 4: Recreate the trigger
CREATE TRIGGER trigger_archive_dossier_tasks
  AFTER UPDATE ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION archive_dossier_tasks();