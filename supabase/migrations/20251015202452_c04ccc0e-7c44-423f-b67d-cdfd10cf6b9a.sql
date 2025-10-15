-- Fix column name in fn_seed_dossier_tasks_sql (fd_org_id -> assigned_fd_org_id)

DROP FUNCTION IF EXISTS public.fn_seed_dossier_tasks_sql(uuid, text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.fn_seed_dossier_tasks_sql(
  p_dossier_id uuid,
  p_flow text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id uuid;
  v_todo_column_id uuid;
  v_org_id uuid;
  v_task_templates jsonb;
  v_task jsonb;
BEGIN
  -- Haal org_id op via dossier (CORRECTE KOLOMNAAM: assigned_fd_org_id)
  SELECT assigned_fd_org_id INTO v_org_id
  FROM dossiers
  WHERE id = p_dossier_id;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Haal of maak board aan
  SELECT id INTO v_board_id
  FROM task_boards
  WHERE org_id = v_org_id
  LIMIT 1;

  IF v_board_id IS NULL THEN
    INSERT INTO task_boards (org_id, name)
    VALUES (v_org_id, 'Taken')
    RETURNING id INTO v_board_id;
  END IF;

  -- Haal of maak TODO kolom aan
  SELECT id INTO v_todo_column_id
  FROM task_board_columns
  WHERE board_id = v_board_id AND key = 'todo'
  LIMIT 1;

  IF v_todo_column_id IS NULL THEN
    INSERT INTO task_board_columns (board_id, key, label, order_idx, is_done)
    VALUES (v_board_id, 'todo', 'Te doen', 1, false)
    RETURNING id INTO v_todo_column_id;
  END IF;

  -- Template mapping
  v_task_templates := CASE
    WHEN p_flow = 'LOC' THEN
      CASE p_status
        WHEN 'CREATED' THEN '[]'::jsonb
        WHEN 'INTAKE_IN_PROGRESS' THEN '[
          {"title":"Intake gesprek met familie","description":"Voer intake gesprek"},
          {"title":"Basisgegevens overledene verzamelen","description":"Verzamel gegevens"}
        ]'::jsonb
        WHEN 'INTAKE_COMPLETE' THEN '[
          {"title":"Documenten controleren","description":"Check documenten"},
          {"title":"Planning maken","description":"Maak planning"}
        ]'::jsonb
        WHEN 'DOCUMENTS_PENDING' THEN '[
          {"title":"Wachten op ontbrekende documenten","description":"Volg op"}
        ]'::jsonb
        WHEN 'MOSQUE_PLANNED' THEN '[
          {"title":"Moskee dienst voorbereiden","description":"Bevestig met moskee"}
        ]'::jsonb
        WHEN 'WASHING_PLANNED' THEN '[
          {"title":"Wassing voorbereiden","description":"Coördineer wassing"}
        ]'::jsonb
        WHEN 'READY_FOR_SERVICE' THEN '[
          {"title":"Laatste controles uitvoeren","description":"Finale checks"}
        ]'::jsonb
        WHEN 'IN_PROGRESS' THEN '[
          {"title":"Dienst begeleiden","description":"Begeleid dienst"}
        ]'::jsonb
        WHEN 'COMPLETED' THEN '[
          {"title":"Administratie afronden","description":"Rond af"}
        ]'::jsonb
        WHEN 'CLOSED' THEN '[]'::jsonb
        ELSE '[]'::jsonb
      END
    WHEN p_flow = 'REP' THEN
      CASE p_status
        WHEN 'CREATED' THEN '[]'::jsonb
        WHEN 'INTAKE_IN_PROGRESS' THEN '[
          {"title":"Repatriëring intake","description":"Verzamel repatriëring info"}
        ]'::jsonb
        WHEN 'INTAKE_COMPLETE' THEN '[
          {"title":"Repatriëring documenten voorbereiden","description":"Bereid documenten voor"}
        ]'::jsonb
        WHEN 'DOCUMENTS_PENDING' THEN '[
          {"title":"Wachten op repatriëring documenten","description":"Volg documenten op"}
        ]'::jsonb
        WHEN 'FLIGHT_PLANNED' THEN '[
          {"title":"Vlucht bevestigen","description":"Bevestig vlucht details"}
        ]'::jsonb
        WHEN 'READY_FOR_REPATRIATION' THEN '[
          {"title":"Repatriëring voorbereiden","description":"Finale voorbereidingen"}
        ]'::jsonb
        WHEN 'IN_TRANSIT' THEN '[
          {"title":"Transport volgen","description":"Monitor transport"}
        ]'::jsonb
        WHEN 'COMPLETED' THEN '[
          {"title":"Repatriëring afronden","description":"Sluit af"}
        ]'::jsonb
        WHEN 'CLOSED' THEN '[]'::jsonb
        ELSE '[]'::jsonb
      END
    ELSE '[]'::jsonb
  END;

  -- Voeg nieuwe taken toe (alleen als ze nog niet bestaan EN status != AFGEROND)
  FOR v_task IN SELECT * FROM jsonb_array_elements(v_task_templates)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM kanban_tasks
      WHERE dossier_id = p_dossier_id
        AND title = v_task->>'title'
        AND status != 'AFGEROND'
    ) THEN
      INSERT INTO kanban_tasks (
        org_id,
        board_id,
        column_id,
        dossier_id,
        title,
        description,
        status,
        priority,
        position
      ) VALUES (
        v_org_id,
        v_board_id,
        v_todo_column_id,
        p_dossier_id,
        v_task->>'title',
        v_task->>'description',
        'TE_DOEN',
        'MEDIUM',
        0
      );
    END IF;
  END LOOP;
END;
$$;