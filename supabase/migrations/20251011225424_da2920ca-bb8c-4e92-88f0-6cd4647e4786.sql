-- COMPLETE FIX: Update fn_seed_dossier_tasks_sql met alle correcties
-- Deze migratie lost ALLE problemen op:
-- 1. Verwijdert referentie naar niet-bestaande created_by veld
-- 2. Gebruikt task_priority type in plaats van priority
-- 3. Gebruikt Nederlandse status waarden (TE_DOEN)

DROP FUNCTION IF EXISTS public.fn_seed_dossier_tasks_sql(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.fn_seed_dossier_tasks_sql(
  _dossier_id UUID,
  _flow TEXT,
  _status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _board_id UUID;
  _org_id UUID;
  _col_todo UUID;
  _task_templates JSONB;
BEGIN
  -- Get organization from dossier (geen created_by meer)
  SELECT assigned_fd_org_id INTO _org_id
  FROM dossiers
  WHERE id = _dossier_id;

  IF _org_id IS NULL THEN
    RETURN;
  END IF;

  -- Get or create board for org
  SELECT id INTO _board_id
  FROM task_boards
  WHERE org_id = _org_id
  LIMIT 1;

  IF _board_id IS NULL THEN
    INSERT INTO task_boards (org_id, name)
    VALUES (_org_id, 'Taken')
    RETURNING id INTO _board_id;
  END IF;

  -- Get or create TODO column
  SELECT id INTO _col_todo
  FROM task_board_columns
  WHERE board_id = _board_id AND key = 'todo'
  LIMIT 1;

  IF _col_todo IS NULL THEN
    INSERT INTO task_board_columns (board_id, key, label, order_idx, is_done)
    VALUES (_board_id, 'todo', 'Te doen', 1, false)
    RETURNING id INTO _col_todo;
  END IF;

  -- Define task templates based on status
  IF _status = 'INTAKE_IN_PROGRESS' AND _flow IN ('LOC', 'REP') THEN
    _task_templates := '[
      {"title": "Overlijdensakte uploaden", "task_type": "INTAKE_DEATH_CERTIFICATE"},
      {"title": "ID document uploaden", "task_type": "INTAKE_ID_DOCUMENT"}
    ]'::JSONB;
  ELSE
    RETURN;
  END IF;

  -- Insert tasks met CORRECTE types en waarden
  INSERT INTO kanban_tasks (
    board_id, 
    column_id, 
    dossier_id, 
    title, 
    description, 
    priority,  -- Dit is task_priority type
    status,    -- Dit moet TE_DOEN zijn
    position, 
    labels
  )
  SELECT 
    _board_id,
    _col_todo,
    _dossier_id,
    (t->>'title')::TEXT,
    ''::TEXT,
    'MEDIUM'::task_priority,  -- Correct type cast
    'TE_DOEN'::TEXT,          -- Nederlandse waarde
    ROW_NUMBER() OVER ()::INTEGER,
    ARRAY[(t->>'task_type')::TEXT]
  FROM jsonb_array_elements(_task_templates) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM kanban_tasks kt
    WHERE kt.dossier_id = _dossier_id
      AND (t->>'task_type')::TEXT = ANY(kt.labels)
  );
END;
$$;