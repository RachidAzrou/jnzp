-- Fix fn_seed_dossier_tasks_sql to use TE_DOEN/BEZIG/AFGEROND

-- Step 1: Fix existing tasks with wrong statuses
UPDATE kanban_tasks SET status = 'TE_DOEN' WHERE status = 'TODO';
UPDATE kanban_tasks SET status = 'BEZIG' WHERE status = 'IN_PROGRESS';
UPDATE kanban_tasks SET status = 'AFGEROND' WHERE status = 'DONE';

-- Step 2: Recreate function with correct Dutch statuses
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
  -- Get organization from dossier
  SELECT fd_org_id INTO v_org_id
  FROM dossiers
  WHERE id = p_dossier_id;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Get or create board
  SELECT id INTO v_board_id
  FROM task_boards
  WHERE org_id = v_org_id
  LIMIT 1;

  IF v_board_id IS NULL THEN
    INSERT INTO task_boards (org_id, name)
    VALUES (v_org_id, 'Taken')
    RETURNING id INTO v_board_id;
  END IF;

  -- Get or create todo column
  SELECT id INTO v_todo_column_id
  FROM task_board_columns
  WHERE board_id = v_board_id AND key = 'todo'
  LIMIT 1;

  IF v_todo_column_id IS NULL THEN
    INSERT INTO task_board_columns (board_id, key, label, order_idx, is_done)
    VALUES (v_board_id, 'todo', 'Te doen', 1, false)
    RETURNING id INTO v_todo_column_id;
  END IF;

  -- Define task templates based on flow and status
  IF p_flow = 'LOC' THEN
    v_task_templates := CASE p_status
      WHEN 'INTAKE_IN_PROGRESS' THEN '[
        {"title": "Persoonlijke gegevens overledene verzamelen", "description": "Naam, geboortedatum, BSN, nationaliteit"},
        {"title": "Contactgegevens nabestaanden vastleggen", "description": "Telefoonnummers, e-mailadressen"},
        {"title": "Gewenste uitvaartdatum en tijd bespreken", "description": "Voorkeuren van de familie vastleggen"}
      ]'::jsonb
      WHEN 'INTAKE_COMPLETE' THEN '[
        {"title": "Akte van overlijden aanvragen bij gemeente", "description": "Nodig voor verdere procedures"},
        {"title": "Verzekeringspapieren controleren", "description": "Polisgegevens opvragen bij familie"}
      ]'::jsonb
      WHEN 'PLANNING' THEN '[
        {"title": "Locatie voor uitvaart reserveren", "description": "Aula, kerk of andere locatie"},
        {"title": "Rouwkaarten ontwerpen en bestellen", "description": "In overleg met nabestaanden"},
        {"title": "Bloemen en decoratie regelen", "description": "Volgens wensen familie"}
      ]'::jsonb
      WHEN 'IN_EXECUTION' THEN '[
        {"title": "Kist en uitvaartauto klaarzetten", "description": "Dag voor uitvaart"},
        {"title": "Condoleanceregister voorbereiden", "description": "Op locatie plaatsen"},
        {"title": "Uitvaart begeleiden", "description": "Ceremonie en begrafenis/crematie"}
      ]'::jsonb
      WHEN 'AFTERCARE' THEN '[
        {"title": "Eindafrekening maken", "description": "Alle kosten verwerken"},
        {"title": "Feedback vragen aan nabestaanden", "description": "Evaluatie dienstverlening"}
      ]'::jsonb
      ELSE '[]'::jsonb
    END;
  ELSIF p_flow = 'REP' THEN
    v_task_templates := CASE p_status
      WHEN 'INTAKE_IN_PROGRESS' THEN '[
        {"title": "Repatriëringsdocumenten voorbereiden", "description": "Paspoort, overlijdensakte, toestemming"},
        {"title": "Contactpersoon in land van bestemming identificeren", "description": "Familie of begrafenisondernemer"},
        {"title": "Gewenste repatriëringsdatum bespreken", "description": "Planning met familie afstemmen"}
      ]'::jsonb
      WHEN 'INTAKE_COMPLETE' THEN '[
        {"title": "Consulaire verklaring aanvragen", "description": "Bij ambassade of consulaat"},
        {"title": "Vervoersvergunning regelen", "description": "Toestemming luchtvaartmaatschappij"}
      ]'::jsonb
      WHEN 'REPATRIATION_PREP' THEN '[
        {"title": "Vliegtickets boeken", "description": "Voor overledene en eventuele begeleiding"},
        {"title": "Kist geschikt maken voor luchttransport", "description": "Zinkenlap en verzegeling"},
        {"title": "Douanepapieren voorbereiden", "description": "Voor vertrek en aankomst"}
      ]'::jsonb
      WHEN 'IN_TRANSIT' THEN '[
        {"title": "Vracht naar luchthaven vervoeren", "description": "Tijdig voor vertrek"},
        {"title": "Contactpersoon op de hoogte houden", "description": "Updates over vlucht en aankomst"}
      ]'::jsonb
      WHEN 'DELIVERED' THEN '[
        {"title": "Bevestiging van overdracht ontvangen", "description": "Van ontvangende partij"},
        {"title": "Eindafrekening maken", "description": "Alle kosten verwerken"}
      ]'::jsonb
      ELSE '[]'::jsonb
    END;
  ELSE
    v_task_templates := '[]'::jsonb;
  END IF;

  -- Insert tasks that don't already exist
  FOR v_task IN SELECT * FROM jsonb_array_elements(v_task_templates)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM kanban_tasks
      WHERE dossier_id = p_dossier_id
        AND title = v_task->>'title'
        AND status != 'AFGEROND'
    ) THEN
      INSERT INTO kanban_tasks (
        board_id,
        column_id,
        org_id,
        dossier_id,
        title,
        description,
        status,
        priority
      ) VALUES (
        v_board_id,
        v_todo_column_id,
        v_org_id,
        p_dossier_id,
        v_task->>'title',
        v_task->>'description',
        'TE_DOEN',
        'MEDIUM'
      );
    END IF;
  END LOOP;
END;
$$;

-- Step 3: Recreate trigger function
DROP FUNCTION IF EXISTS public.fn_auto_seed_tasks_on_status_change() CASCADE;

CREATE OR REPLACE FUNCTION public.fn_auto_seed_tasks_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM fn_seed_dossier_tasks_sql(NEW.id, NEW.flow::text, NEW.status::text);
  END IF;
  RETURN NEW;
END;
$$;

-- Step 4: Recreate trigger
DROP TRIGGER IF EXISTS trigger_auto_seed_tasks_on_status_change ON dossiers;

CREATE TRIGGER trigger_auto_seed_tasks_on_status_change
  AFTER UPDATE ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_seed_tasks_on_status_change();