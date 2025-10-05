-- Update existing task board columns with correct names
-- First, get the board and update column names in place

DO $$
DECLARE
  v_board_id uuid;
  v_col1_id uuid;
  v_col2_id uuid;
  v_col3_id uuid;
BEGIN
  -- For each board
  FOR v_board_id IN (SELECT id FROM public.task_boards)
  LOOP
    -- Get the three columns ordered by order_idx
    SELECT id INTO v_col1_id 
    FROM public.task_board_columns 
    WHERE board_id = v_board_id 
    ORDER BY order_idx 
    LIMIT 1;
    
    SELECT id INTO v_col2_id 
    FROM public.task_board_columns 
    WHERE board_id = v_board_id 
    ORDER BY order_idx 
    LIMIT 1 OFFSET 1;
    
    SELECT id INTO v_col3_id 
    FROM public.task_board_columns 
    WHERE board_id = v_board_id 
    ORDER BY order_idx 
    LIMIT 1 OFFSET 2;
    
    -- Update the columns with correct names
    IF v_col1_id IS NOT NULL THEN
      UPDATE public.task_board_columns 
      SET key = 'TE_DOEN', label = 'Te doen', order_idx = 1, is_done = false
      WHERE id = v_col1_id;
    END IF;
    
    IF v_col2_id IS NOT NULL THEN
      UPDATE public.task_board_columns 
      SET key = 'BEZIG', label = 'Bezig', order_idx = 2, is_done = false
      WHERE id = v_col2_id;
    END IF;
    
    IF v_col3_id IS NOT NULL THEN
      UPDATE public.task_board_columns 
      SET key = 'AFGESLOTEN', label = 'Afgesloten', order_idx = 3, is_done = true
      WHERE id = v_col3_id;
    END IF;
    
    -- Delete any extra columns beyond the first 3
    DELETE FROM public.task_board_columns
    WHERE board_id = v_board_id
    AND id NOT IN (v_col1_id, v_col2_id, v_col3_id);
  END LOOP;
END $$;