-- =====================================================
-- JanazApp Task Templates per Status
-- =====================================================

-- Drop oude seeding functie
DROP FUNCTION IF EXISTS public.fn_seed_dossier_tasks_sql(uuid, text, text) CASCADE;

-- Maak nieuwe task seeding functie met realistische taken per status
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
    -- Check of taak al bestaat
    IF NOT EXISTS (
      SELECT 1 FROM kanban_tasks
      WHERE dossier_id = p_dossier_id
        AND title = v_task->>'title'
        AND status != 'DONE'
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
        'TODO'
      );
    END IF;
  END LOOP;
END;
$$;

-- Trigger voor automatische task seeding bij status change
CREATE OR REPLACE FUNCTION public.fn_auto_seed_tasks_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seed taken bij statuswijziging
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM fn_seed_dossier_tasks_sql(NEW.id, NEW.flow::text, NEW.status::text);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_seed_tasks ON public.dossiers;
CREATE TRIGGER trigger_auto_seed_tasks
AFTER UPDATE OF status ON public.dossiers
FOR EACH ROW
EXECUTE FUNCTION fn_auto_seed_tasks_on_status_change();

-- Functie voor auto-progressie: check of alle taken afgerond zijn
CREATE OR REPLACE FUNCTION public.check_and_progress_dossier(p_dossier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dossier RECORD;
  v_open_tasks_count integer;
  v_next_status text;
  v_blocked jsonb;
BEGIN
  -- Haal dossier op
  SELECT * INTO v_dossier
  FROM dossiers
  WHERE id = p_dossier_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dossier niet gevonden');
  END IF;
  
  -- Check blokkades
  v_blocked := is_dossier_blocked(p_dossier_id);
  IF (v_blocked->>'blocked')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'blocked', true,
      'block_info', v_blocked,
      'message', 'Dossier voldoet aan voorwaarden maar is geblokkeerd door ' || (v_blocked->>'type')
    );
  END IF;
  
  -- Tel open taken voor huidige status
  SELECT COUNT(*) INTO v_open_tasks_count
  FROM kanban_tasks
  WHERE dossier_id = p_dossier_id
    AND status != 'DONE';
  
  -- Als er nog open taken zijn, kan niet doorgaan
  IF v_open_tasks_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'can_progress', false,
      'open_tasks', v_open_tasks_count,
      'message', 'Er zijn nog ' || v_open_tasks_count || ' taken open'
    );
  END IF;
  
  -- Bepaal volgende status
  CASE v_dossier.status
    WHEN 'CREATED' THEN
      -- Check of verzekeraar API beschikbaar is (simpele check: heeft het dossier een insurer_org_id?)
      IF v_dossier.insurer_org_id IS NOT NULL AND v_dossier.policy_verification_method = 'API' THEN
        v_next_status := 'IN_PROGRESS';
      ELSE
        v_next_status := 'UNDER_REVIEW';
      END IF;
    WHEN 'UNDER_REVIEW' THEN
      v_next_status := 'IN_PROGRESS';
    WHEN 'IN_PROGRESS' THEN
      v_next_status := 'COMPLETED';
    WHEN 'COMPLETED' THEN
      v_next_status := 'CLOSED';
    WHEN 'CLOSED' THEN
      -- Al op einde
      RETURN jsonb_build_object(
        'success', true,
        'already_final', true,
        'message', 'Dossier is al afgesloten'
      );
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Onbekende status');
  END CASE;
  
  -- Update status
  UPDATE dossiers
  SET status = v_next_status::simple_dossier_status,
      updated_at = now()
  WHERE id = p_dossier_id;
  
  -- Log de status change
  INSERT INTO audit_events (
    user_id,
    event_type,
    target_type,
    target_id,
    dossier_id,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    'AUTO_STATUS_PROGRESSION',
    'Dossier',
    p_dossier_id,
    p_dossier_id,
    'Dossier automatisch doorgeschakeld naar ' || v_next_status,
    jsonb_build_object(
      'from_status', v_dossier.status,
      'to_status', v_next_status,
      'reason', 'Alle taken afgerond'
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'progressed', true,
    'from_status', v_dossier.status,
    'to_status', v_next_status,
    'message', 'Dossier doorgeschakeld naar ' || v_next_status
  );
END;
$$;

-- Trigger om auto-progressie te checken bij taak completion
CREATE OR REPLACE FUNCTION public.fn_check_progress_on_task_done()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Als een taak op DONE wordt gezet, check auto-progressie
  IF NEW.status = 'DONE' AND OLD.status != 'DONE' THEN
    PERFORM check_and_progress_dossier(NEW.dossier_id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_progress_on_task_done ON public.kanban_tasks;
CREATE TRIGGER trigger_check_progress_on_task_done
AFTER UPDATE OF status ON public.kanban_tasks
FOR EACH ROW
WHEN (NEW.dossier_id IS NOT NULL)
EXECUTE FUNCTION fn_check_progress_on_task_done();