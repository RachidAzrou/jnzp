-- Zorg voor correcte search_path
ALTER DATABASE postgres SET search_path = public;

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
  v_doing_col_id UUID;
  v_done_col_id UUID;
BEGIN
  SELECT assigned_fd_org_id INTO v_org
  FROM dossiers
  WHERE id = p_dossier_id;

  IF v_org IS NULL THEN
    RETURN;
  END IF;

  -- board
  SELECT id INTO v_board_id
  FROM task_boards
  WHERE org_id = v_org
  LIMIT 1;

  IF v_board_id IS NULL THEN
    INSERT INTO task_boards (org_id, name)
    VALUES (v_org, 'Taken')
    RETURNING id INTO v_board_id;

    INSERT INTO task_board_columns (board_id, key, label, position, is_done)
    VALUES
      (v_board_id, 'todo',  'Te doen',   1, false),
      (v_board_id, 'doing', 'Bezig',     2, false),
      (v_board_id, 'done',  'Afgerond',  3, true);
  END IF;

  -- kolommen (of aanmaken als missen)
  SELECT id INTO v_todo_col_id  FROM task_board_columns WHERE board_id = v_board_id AND key='todo'  LIMIT 1;
  IF v_todo_col_id IS NULL THEN
    INSERT INTO task_board_columns (board_id, key, label, position, is_done)
    VALUES (v_board_id, 'todo', 'Te doen', 1, false)
    RETURNING id INTO v_todo_col_id;
  END IF;

  SELECT id INTO v_doing_col_id FROM task_board_columns WHERE board_id = v_board_id AND key='doing' LIMIT 1;
  IF v_doing_col_id IS NULL THEN
    INSERT INTO task_board_columns (board_id, key, label, position, is_done)
    VALUES (v_board_id, 'doing', 'Bezig', 2, false)
    RETURNING id INTO v_doing_col_id;
  END IF;

  SELECT id INTO v_done_col_id  FROM task_board_columns WHERE board_id = v_board_id AND key='done'  LIMIT 1;
  IF v_done_col_id IS NULL THEN
    INSERT INTO task_board_columns (board_id, key, label, position, is_done)
    VALUES (v_board_id, 'done', 'Afgerond', 3, true)
    RETURNING id INTO v_done_col_id;
  END IF;

  -- idempotent: geen duplicates
  IF EXISTS (SELECT 1 FROM kanban_tasks WHERE dossier_id = p_dossier_id) THEN
    RETURN;
  END IF;

  -- basis seeding per flow
  IF p_flow = 'LOC' THEN
    INSERT INTO kanban_tasks (dossier_id, org_id, board_id, column_id, title, priority)
    VALUES
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Intake starten', 'MEDIUM'),
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Overlijdensakte controleren', 'HIGH'),
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'ID-document vastleggen', 'HIGH'),
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Verzekering verifiëren', 'HIGH'),
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Mortuarium plannen (koeling + wassing)', 'MEDIUM'),
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Moskee & janazah plannen', 'MEDIUM'),
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Begraafplaats & concessie bevestigen', 'MEDIUM');
  ELSIF p_flow = 'REP' THEN
    INSERT INTO kanban_tasks (dossier_id, org_id, board_id, column_id, title, priority)
    VALUES
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Intake starten (repatriëring)', 'MEDIUM'),
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Overlijdensakte controleren', 'HIGH'),
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Paspoort overledene controleren', 'HIGH'),
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Verzekering verifiëren / offerte', 'HIGH'),
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Mortuarium plannen', 'MEDIUM'),
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Consulaire documenten regelen', 'MEDIUM'),
      (p_dossier_id, v_org, v_board_id, v_todo_col_id, 'Vluchtvoorstel / AWB voorbereiden', 'MEDIUM');
  END IF;
END;
$$;

-- Permissies
GRANT EXECUTE ON FUNCTION public.fn_seed_dossier_tasks_sql(UUID, TEXT, TEXT) TO authenticated;