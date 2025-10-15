-- Fix fn_seed_dossier_tasks_sql to use Dutch status values
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
  -- Haal org_id op
  SELECT assigned_fd_org_id INTO v_org_id
  FROM dossiers
  WHERE id = p_dossier_id;
  
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Haal of maak board
  SELECT id INTO v_board_id
  FROM task_boards
  WHERE org_id = v_org_id
  LIMIT 1;
  
  IF v_board_id IS NULL THEN
    INSERT INTO task_boards (org_id, name)
    VALUES (v_org_id, 'Taken')
    RETURNING id INTO v_board_id;
  END IF;
  
  -- Haal todo column
  SELECT id INTO v_todo_column_id
  FROM task_board_columns
  WHERE board_id = v_board_id AND key = 'todo'
  LIMIT 1;
  
  IF v_todo_column_id IS NULL THEN
    INSERT INTO task_board_columns (board_id, key, label, order_idx, is_done)
    VALUES (v_board_id, 'todo', 'Te doen', 1, false)
    RETURNING id INTO v_todo_column_id;
  END IF;
  
  -- Define task templates per status
  IF p_status = 'CREATED' THEN
    v_task_templates := '[
      {"title": "Documenten opladen", "description": "Upload alle benodigde documenten voor het dossier", "priority": "HIGH"},
      {"title": "Verzekering bevestigen", "description": "Voer polisnummer en verzekeraar in", "priority": "HIGH"}
    ]'::jsonb;
    
  ELSIF p_status = 'UNDER_REVIEW' THEN
    v_task_templates := '[
      {"title": "Handmatige polisbevestiging", "description": "Controleer en bevestig de polis handmatig", "priority": "HIGH"},
      {"title": "Bewijsdocument polis opladen", "description": "Upload het polisdocument ter bevestiging", "priority": "MEDIUM"}
    ]'::jsonb;
    
  ELSIF p_status = 'IN_PROGRESS' THEN
    v_task_templates := '[
      {"title": "Documentcheck op volledigheid", "description": "Controleer of alle documenten aanwezig zijn", "priority": "HIGH"},
      {"title": "Mortuarium reserveren", "description": "Plan en bevestig mortuarium reservering", "priority": "HIGH"},
      {"title": "Moskee (janaza-gebed) bevestigen", "description": "Bevestig janaza-gebed met moskee", "priority": "HIGH"},
      {"title": "Kist en benodigdheden regelen", "description": "Bestellen van kist en andere benodigdheden", "priority": "MEDIUM"},
      {"title": "Begraafplaats of repatriëring bevestigen", "description": "Bevestig locatie en tijdstip voor begrafenis of repatriëring", "priority": "HIGH"},
      {"title": "Vervoer plannen", "description": "Regel transport voor de overledene", "priority": "MEDIUM"},
      {"title": "Familie informeren", "description": "Houd familie op de hoogte van de planning", "priority": "HIGH"},
      {"title": "Overlijdensbericht publiceren (optioneel)", "description": "Publiceer overlijdensbericht indien gewenst", "priority": "LOW"}
    ]'::jsonb;
    
  ELSIF p_status = 'COMPLETED' THEN
    v_task_templates := '[
      {"title": "Dossier-afrondingscheck", "description": "Controleer of alle stappen zijn voltooid", "priority": "HIGH"},
      {"title": "Factuur opstellen", "description": "Genereer en controleer de factuur", "priority": "HIGH"},
      {"title": "Dossier-samenvatting genereren", "description": "Maak een overzicht van het volledige dossier", "priority": "MEDIUM"}
    ]'::jsonb;
    
  ELSIF p_status = 'CLOSED' THEN
    v_task_templates := '[
      {"title": "Betaling registreren en valideren", "description": "Verwerk en bevestig de betaling", "priority": "HIGH"},
      {"title": "Archiefcontrole uitvoeren", "description": "Controleer of dossier compleet is voor archivering", "priority": "MEDIUM"},
      {"title": "Dossier vergrendelen", "description": "Vergrendel het dossier definitief", "priority": "MEDIUM"}
    ]'::jsonb;
    
  ELSE
    RETURN; -- Geen taken voor onbekende status
  END IF;
  
  -- Insert taken die nog niet bestaan
  FOR v_task IN SELECT * FROM jsonb_array_elements(v_task_templates)
  LOOP
    -- Check of taak al bestaat (gebruik AFGEROND ipv DONE)
    IF NOT EXISTS (
      SELECT 1 FROM kanban_tasks
      WHERE dossier_id = p_dossier_id
        AND title = v_task->>'title'
        AND status != 'AFGEROND'
    ) THEN
      INSERT INTO kanban_tasks (
        board_id,
        column_id,
        dossier_id,
        title,
        description,
        priority,
        status
      ) VALUES (
        v_board_id,
        v_todo_column_id,
        p_dossier_id,
        v_task->>'title',
        v_task->>'description',
        (v_task->>'priority')::priority,
        'TE_DOEN'  -- Gebruik TE_DOEN ipv TODO
      );
    END IF;
  END LOOP;
END;
$$;