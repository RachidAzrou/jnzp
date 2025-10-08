-- Create de ontbrekende helper functie
CREATE OR REPLACE FUNCTION public.fn_ensure_board_and_todo_col(p_org uuid, OUT o_board uuid, OUT o_todo uuid)
RETURNS record
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT id INTO o_board FROM public.task_boards WHERE org_id = p_org;
  IF o_board IS NULL THEN
    INSERT INTO public.task_boards (org_id, name) VALUES (p_org, 'Taken')
    RETURNING id INTO o_board;
    -- standaard kolommen
    INSERT INTO public.task_board_columns (board_id,label,order_idx,key) VALUES
      (o_board,'Te doen',1,'todo'),(o_board,'Bezig',2,'doing'),(o_board,'Afgerond',3,'done');
  ELSE
    -- ensure minimaal To do bestaat
    PERFORM 1 FROM public.task_board_columns WHERE board_id=o_board AND key='todo';
    IF NOT FOUND THEN
      INSERT INTO public.task_board_columns (board_id,label,order_idx,key) VALUES (o_board,'Te doen',1,'todo');
    END IF;
  END IF;

  SELECT id INTO o_todo
  FROM public.task_board_columns
  WHERE board_id=o_board AND key='todo'
  LIMIT 1;

  IF o_todo IS NULL THEN
    INSERT INTO public.task_board_columns (board_id,label,order_idx,key) VALUES (o_board,'Te doen',1,'todo')
    RETURNING id INTO o_todo;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';