-- Verwijder dubbele kolommen (oude uppercase keys)
DELETE FROM task_board_columns 
WHERE key IN ('TE_DOEN', 'BEZIG', 'AFGEROND');

-- Update order_idx voor de correcte kolommen
UPDATE task_board_columns 
SET order_idx = CASE 
  WHEN key = 'todo' THEN 1
  WHEN key = 'doing' THEN 2
  WHEN key = 'done' THEN 3
END
WHERE key IN ('todo', 'doing', 'done');