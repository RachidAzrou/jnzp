-- Add archived_at column to kanban_tasks (timestamp for when task was archived)
ALTER TABLE public.kanban_tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for performance on archived tasks
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_archived_at ON public.kanban_tasks(archived_at) WHERE archived_at IS NOT NULL;

-- Function to archive tasks when dossier is archived
CREATE OR REPLACE FUNCTION archive_dossier_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- When dossier status changes to ARCHIVED, archive all its tasks immediately
  IF NEW.status = 'ARCHIVED' AND (OLD.status IS DISTINCT FROM 'ARCHIVED') THEN
    UPDATE kanban_tasks
    SET archived_at = NOW(),
        is_archived = true
    WHERE dossier_id = NEW.id
      AND archived_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-archive tasks when dossier is archived
DROP TRIGGER IF EXISTS trigger_archive_dossier_tasks ON public.dossiers;
CREATE TRIGGER trigger_archive_dossier_tasks
  AFTER UPDATE ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION archive_dossier_tasks();

-- Function to auto-archive completed tasks after 24 hours
-- This will be called by the cleanup edge function
CREATE OR REPLACE FUNCTION auto_archive_old_completed_tasks()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER := 0;
  done_column_id UUID;
BEGIN
  -- Get the "Afgesloten" / "DONE" column ID
  -- We look for columns with is_done = true
  SELECT id INTO done_column_id
  FROM task_board_columns
  WHERE is_done = true
  LIMIT 1;
  
  IF done_column_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Archive tasks that have been in the DONE column for more than 24 hours
  WITH archived AS (
    UPDATE kanban_tasks
    SET archived_at = NOW(),
        is_archived = true
    WHERE column_id = done_column_id
      AND archived_at IS NULL
      AND updated_at < NOW() - INTERVAL '24 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO archived_count FROM archived;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;