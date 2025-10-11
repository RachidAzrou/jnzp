-- ============================================
-- HIGH PRIORITY 7: Soft-delete voor dossiers
-- ============================================

-- Add soft-delete columns
ALTER TABLE dossiers 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS delete_reason TEXT;

-- Index voor performance
CREATE INDEX IF NOT EXISTS idx_dossiers_deleted 
ON dossiers(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- RLS policy update: Verberg deleted dossiers
DROP POLICY IF EXISTS "dossiers_hide_deleted" ON dossiers;
CREATE POLICY "dossiers_hide_deleted" ON dossiers
FOR SELECT
USING (deleted_at IS NULL OR has_role(auth.uid(), 'admin'::app_role));

-- Soft-delete functie
CREATE OR REPLACE FUNCTION soft_delete_dossier(p_dossier_id UUID, p_reason TEXT)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Alleen toestaan voor drafts of INTAKE_IN_PROGRESS status
  IF NOT EXISTS (
    SELECT 1 FROM dossiers 
    WHERE id = p_dossier_id 
    AND status IN ('CREATED', 'INTAKE_IN_PROGRESS')
  ) THEN
    RAISE EXCEPTION 'Kan alleen draft-dossiers verwijderen';
  END IF;

  UPDATE dossiers
  SET deleted_at = NOW(),
      deleted_by = auth.uid(),
      delete_reason = p_reason
  WHERE id = p_dossier_id;

  -- Audit log
  INSERT INTO audit_events (user_id, event_type, target_type, target_id, description, metadata)
  VALUES (
    auth.uid(),
    'DOSSIER_DELETED',
    'Dossier',
    p_dossier_id,
    'Dossier soft-deleted',
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

-- ============================================
-- HIGH PRIORITY 6: Task timeline logging
-- ============================================

-- Trigger om task events te loggen naar dossier timeline
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
      jsonb_build_object('task_id', NEW.id, 'task_type', NEW.task_type)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.dossier_id IS NOT NULL THEN
    IF OLD.status != NEW.status AND NEW.status = 'DONE' THEN
      INSERT INTO dossier_events (dossier_id, event_type, event_description, created_by, metadata)
      VALUES (
        NEW.dossier_id,
        'TASK_COMPLETED',
        'Taak afgerond: ' || NEW.title,
        auth.uid(),
        jsonb_build_object('task_id', NEW.id, 'task_type', NEW.task_type)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop oude trigger als die bestaat
DROP TRIGGER IF EXISTS trg_log_task_timeline ON kanban_tasks;

-- Create nieuwe trigger
CREATE TRIGGER trg_log_task_timeline
AFTER INSERT OR UPDATE ON kanban_tasks
FOR EACH ROW
WHEN (NEW.dossier_id IS NOT NULL)
EXECUTE FUNCTION log_task_to_dossier_timeline();

-- ============================================
-- MEDIUM PRIORITY 11: Auto-cleanup taken
-- ============================================

-- Functie voor het opschonen van afgeronde automatische taken
CREATE OR REPLACE FUNCTION cleanup_completed_auto_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM kanban_tasks
  WHERE status = 'DONE'
  AND completed_at < NOW() - INTERVAL '24 hours'
  AND metadata->>'auto' = 'true';
END;
$$;