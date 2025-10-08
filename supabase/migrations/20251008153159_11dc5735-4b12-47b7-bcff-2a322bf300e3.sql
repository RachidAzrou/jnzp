-- Fix fn_seed_dossier_tasks_sql to work with task_boards and task_board_columns properly

CREATE OR REPLACE FUNCTION public.fn_seed_dossier_tasks_sql(
  p_dossier_id UUID,
  p_flow TEXT,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID;
  v_board_id UUID;
  v_todo_col_id UUID;
BEGIN
  -- Haal organization op
  SELECT assigned_fd_org_id INTO v_org
  FROM dossiers
  WHERE id = p_dossier_id;

  -- Skip als geen org (niet toegewezen)
  IF v_org IS NULL THEN
    RETURN;
  END IF;

  -- Zoek of maak task board voor deze organisatie
  SELECT id INTO v_board_id
  FROM task_boards
  WHERE org_id = v_org
  LIMIT 1;

  -- Maak board aan als het niet bestaat
  IF v_board_id IS NULL THEN
    INSERT INTO task_boards (org_id, name)
    VALUES (v_org, 'Taken')
    RETURNING id INTO v_board_id;

    -- Maak standaard kolommen aan
    INSERT INTO task_board_columns (board_id, key, label, order_idx, is_done)
    VALUES
      (v_board_id, 'todo', 'To do', 1, false),
      (v_board_id, 'doing', 'Doing', 2, false),
      (v_board_id, 'done', 'Done', 3, true);
  END IF;

  -- Haal de 'To do' kolom op
  SELECT id INTO v_todo_col_id
  FROM task_board_columns
  WHERE board_id = v_board_id
    AND key = 'todo'
  LIMIT 1;

  -- Als kolom niet bestaat, maak dan de default kolommen aan
  IF v_todo_col_id IS NULL THEN
    INSERT INTO task_board_columns (board_id, key, label, order_idx, is_done)
    VALUES
      (v_board_id, 'todo', 'To do', 1, false),
      (v_board_id, 'doing', 'Doing', 2, false),
      (v_board_id, 'done', 'Done', 3, true);
    
    -- Haal de net aangemaakte 'To do' kolom op
    SELECT id INTO v_todo_col_id
    FROM task_board_columns
    WHERE board_id = v_board_id
      AND key = 'todo'
    LIMIT 1;
  END IF;

  -- Idempotent: skip als er al taken bestaan voor dit dossier
  IF EXISTS (SELECT 1 FROM kanban_tasks WHERE dossier_id = p_dossier_id) THEN
    RETURN;
  END IF;

  -- Seed taken op basis van flow (gebruik TEXT vergelijking)
  IF p_flow = 'LOC' THEN
    INSERT INTO kanban_tasks (dossier_id, column_id, org_id, title, priority, status)
    VALUES
      (p_dossier_id, v_todo_col_id, v_org, 'Intake starten', 'MEDIUM', 'TODO'),
      (p_dossier_id, v_todo_col_id, v_org, 'Overlijdensakte controleren', 'HIGH', 'TODO'),
      (p_dossier_id, v_todo_col_id, v_org, 'ID-document vastleggen', 'HIGH', 'TODO'),
      (p_dossier_id, v_todo_col_id, v_org, 'Verzekering verifiëren', 'HIGH', 'TODO'),
      (p_dossier_id, v_todo_col_id, v_org, 'Mortuarium plannen (koeling + wassing)', 'MEDIUM', 'TODO'),
      (p_dossier_id, v_todo_col_id, v_org, 'Moskee & janazah plannen', 'MEDIUM', 'TODO'),
      (p_dossier_id, v_todo_col_id, v_org, 'Begrafenis & concessie bevestigen', 'MEDIUM', 'TODO');
  ELSIF p_flow = 'REP' THEN
    INSERT INTO kanban_tasks (dossier_id, column_id, org_id, title, priority, status)
    VALUES
      (p_dossier_id, v_todo_col_id, v_org, 'Intake starten (repatriëring)', 'MEDIUM', 'TODO'),
      (p_dossier_id, v_todo_col_id, v_org, 'Overlijdensakte controleren', 'HIGH', 'TODO'),
      (p_dossier_id, v_todo_col_id, v_org, 'Paspoort overledene controleren', 'HIGH', 'TODO'),
      (p_dossier_id, v_todo_col_id, v_org, 'Verzekering verifiëren / offerte', 'HIGH', 'TODO'),
      (p_dossier_id, v_todo_col_id, v_org, 'Mortuarium plannen', 'MEDIUM', 'TODO'),
      (p_dossier_id, v_todo_col_id, v_org, 'Consulaire documenten regelen', 'MEDIUM', 'TODO'),
      (p_dossier_id, v_todo_col_id, v_org, 'Vluchtvoorstel / AWB voorbereiden', 'MEDIUM', 'TODO');
  END IF;
END;
$$;