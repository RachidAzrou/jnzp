-- Fix backfill: corrigeer de invalid FROM-clause reference
-- De vorige backfill had een syntax error, deze versie gebruikt correcte SQL syntax

WITH map AS (
  SELECT
    b.org_id,
    b.id AS board_id,
    c.id AS todo_col_id
  FROM public.task_boards b
  JOIN public.task_board_columns c ON c.board_id=b.id AND c.key='todo'
)
UPDATE public.kanban_tasks t
SET board_id  = m.board_id,
    column_id = COALESCE(t.column_id, m.todo_col_id)
FROM map m, public.dossiers d
WHERE d.id = t.dossier_id 
  AND d.assigned_fd_org_id = m.org_id
  AND (t.board_id IS NULL OR t.column_id IS NULL);

-- Refresh cache
NOTIFY pgrst, 'reload schema';