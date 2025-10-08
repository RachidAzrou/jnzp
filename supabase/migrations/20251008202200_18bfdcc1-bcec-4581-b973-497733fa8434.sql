-- Idempotente RPC die een board (en standaardkolommen) aanmaakt/retourneert
CREATE OR REPLACE FUNCTION public.ensure_task_board(p_org uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board uuid;
BEGIN
  -- Haal bestaand board op
  SELECT id INTO v_board FROM task_boards WHERE org_id = p_org LIMIT 1;
  
  -- Maak board aan als het niet bestaat
  IF v_board IS NULL THEN
    INSERT INTO task_boards (org_id, name) 
    VALUES (p_org, 'Taken') 
    RETURNING id INTO v_board;
  END IF;

  -- Zorg voor standaard kolommen
  IF NOT EXISTS (SELECT 1 FROM task_board_columns WHERE board_id = v_board AND key='todo') THEN
    INSERT INTO task_board_columns (board_id, key, label, position, is_done)
    VALUES (v_board, 'todo', 'Te doen', 1, false);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM task_board_columns WHERE board_id = v_board AND key='doing') THEN
    INSERT INTO task_board_columns (board_id, key, label, position, is_done)
    VALUES (v_board, 'doing', 'Bezig', 2, false);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM task_board_columns WHERE board_id = v_board AND key='done') THEN
    INSERT INTO task_board_columns (board_id, key, label, position, is_done)
    VALUES (v_board, 'done', 'Afgerond', 3, true);
  END IF;

  RETURN v_board;
END;
$$;

-- Grant execute rechten aan authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_task_board(uuid) TO authenticated;