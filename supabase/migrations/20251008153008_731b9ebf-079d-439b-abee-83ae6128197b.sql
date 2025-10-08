-- Fix parameter types in fn_seed_dossier_tasks_sql to accept TEXT instead of ENUMs
-- This prevents type casting issues when called from triggers

DROP FUNCTION IF EXISTS public.fn_seed_dossier_tasks_sql(UUID, TEXT, TEXT);

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
  v_todo_col UUID;
BEGIN
  -- Haal organization op
  SELECT assigned_fd_org_id INTO v_org
  FROM dossiers
  WHERE id = p_dossier_id;

  -- Skip als geen org (niet toegewezen)
  IF v_org IS NULL THEN
    RETURN;
  END IF;

  -- Zorg dat board columns bestaan voor deze org
  IF NOT EXISTS (SELECT 1 FROM task_board_columns WHERE organization_id = v_org) THEN
    INSERT INTO task_board_columns (organization_id, label, position)
    VALUES
      (v_org, 'To do', 1),
      (v_org, 'Doing', 2),
      (v_org, 'Done', 3);
  END IF;

  -- Haal de 'To do' kolom op
  SELECT id INTO v_todo_col
  FROM task_board_columns
  WHERE organization_id = v_org
    AND label = 'To do'
  LIMIT 1;

  -- Idempotent: skip als er al taken bestaan voor dit dossier
  IF EXISTS (SELECT 1 FROM kanban_tasks WHERE dossier_id = p_dossier_id) THEN
    RETURN;
  END IF;

  -- Seed taken op basis van flow (gebruik TEXT vergelijking)
  IF p_flow = 'LOC' THEN
    INSERT INTO kanban_tasks (dossier_id, column_id, title, priority, status)
    VALUES
      (p_dossier_id, v_todo_col, 'Intake starten', 'MEDIUM', 'TODO'),
      (p_dossier_id, v_todo_col, 'Overlijdensakte controleren', 'HIGH', 'TODO'),
      (p_dossier_id, v_todo_col, 'ID-document vastleggen', 'HIGH', 'TODO'),
      (p_dossier_id, v_todo_col, 'Verzekering verifiëren', 'HIGH', 'TODO'),
      (p_dossier_id, v_todo_col, 'Mortuarium plannen (koeling + wassing)', 'MEDIUM', 'TODO'),
      (p_dossier_id, v_todo_col, 'Moskee & janazah plannen', 'MEDIUM', 'TODO'),
      (p_dossier_id, v_todo_col, 'Begrafenis & concessie bevestigen', 'MEDIUM', 'TODO');
  ELSIF p_flow = 'REP' THEN
    INSERT INTO kanban_tasks (dossier_id, column_id, title, priority, status)
    VALUES
      (p_dossier_id, v_todo_col, 'Intake starten (repatriëring)', 'MEDIUM', 'TODO'),
      (p_dossier_id, v_todo_col, 'Overlijdensakte controleren', 'HIGH', 'TODO'),
      (p_dossier_id, v_todo_col, 'Paspoort overledene controleren', 'HIGH', 'TODO'),
      (p_dossier_id, v_todo_col, 'Verzekering verifiëren / offerte', 'HIGH', 'TODO'),
      (p_dossier_id, v_todo_col, 'Mortuarium plannen', 'MEDIUM', 'TODO'),
      (p_dossier_id, v_todo_col, 'Consulaire documenten regelen', 'MEDIUM', 'TODO'),
      (p_dossier_id, v_todo_col, 'Vluchtvoorstel / AWB voorbereiden', 'MEDIUM', 'TODO');
  END IF;
END;
$$;

-- Recreate triggers to ensure they use the correct function signature

DROP TRIGGER IF EXISTS trg_dossiers_after_insert_seed ON public.dossiers;
DROP TRIGGER IF EXISTS trg_dossiers_after_update_flow ON public.dossiers;
DROP TRIGGER IF EXISTS trg_dossiers_after_update_status ON public.dossiers;

-- AFTER INSERT trigger
CREATE OR REPLACE FUNCTION public.fn_dossiers_after_insert_seed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log FD_CREATED event
  INSERT INTO dossier_events (dossier_id, event_type, event_description, created_by)
  VALUES (NEW.id, 'FD_CREATED', 'Dossier aangemaakt', auth.uid());

  -- Als flow is LOC of REP: log FLOW_SELECTED en seed taken
  IF NEW.flow::TEXT IN ('LOC', 'REP') THEN
    INSERT INTO dossier_events (
      dossier_id,
      event_type,
      event_description,
      created_by,
      metadata
    ) VALUES (
      NEW.id,
      'FLOW_SELECTED',
      'Flow geselecteerd: ' || NEW.flow::TEXT,
      auth.uid(),
      jsonb_build_object('from', 'UNSET', 'to', NEW.flow::TEXT)
    );

    -- Seed taken (cast ENUMs to TEXT)
    PERFORM fn_seed_dossier_tasks_sql(NEW.id, NEW.flow::TEXT, NEW.status::TEXT);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dossiers_after_insert_seed
  AFTER INSERT ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_dossiers_after_insert_seed();

-- AFTER UPDATE OF flow trigger
CREATE OR REPLACE FUNCTION public.fn_dossiers_after_update_flow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Als flow wijzigt naar LOC/REP
  IF OLD.flow IS DISTINCT FROM NEW.flow AND NEW.flow::TEXT IN ('LOC', 'REP') THEN
    -- Log FLOW_SELECTED
    INSERT INTO dossier_events (
      dossier_id,
      event_type,
      event_description,
      created_by,
      metadata
    ) VALUES (
      NEW.id,
      'FLOW_SELECTED',
      'Flow gewijzigd naar ' || NEW.flow::TEXT,
      auth.uid(),
      jsonb_build_object(
        'from', COALESCE(OLD.flow::TEXT, 'UNSET'),
        'to', NEW.flow::TEXT
      )
    );

    -- Seed taken (cast ENUMs to TEXT)
    PERFORM fn_seed_dossier_tasks_sql(NEW.id, NEW.flow::TEXT, NEW.status::TEXT);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dossiers_after_update_flow
  AFTER UPDATE OF flow ON public.dossiers
  FOR EACH ROW
  WHEN (OLD.flow IS DISTINCT FROM NEW.flow)
  EXECUTE FUNCTION public.fn_dossiers_after_update_flow();

-- AFTER UPDATE OF status trigger
CREATE OR REPLACE FUNCTION public.fn_dossiers_after_update_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seed taken bij INTAKE_IN_PROGRESS of DOCS_PENDING (idempotent, cast to TEXT)
  IF NEW.status::TEXT IN ('INTAKE_IN_PROGRESS', 'DOCS_PENDING') THEN
    PERFORM fn_seed_dossier_tasks_sql(NEW.id, NEW.flow::TEXT, NEW.status::TEXT);
  END IF;

  -- Log INTAKE_COMPLETE wanneer status DOCS_VERIFIED wordt
  IF NEW.status::TEXT = 'DOCS_VERIFIED' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO dossier_events (
      dossier_id,
      event_type,
      event_description,
      created_by
    ) VALUES (
      NEW.id,
      'INTAKE_COMPLETE',
      'Intake afgerond: documenten geverifieerd',
      auth.uid()
    );
  END IF;

  -- Log VERIFICATION_CONFIRMED wanneer status PLANNING wordt
  IF NEW.status::TEXT = 'PLANNING' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO dossier_events (
      dossier_id,
      event_type,
      event_description,
      created_by
    ) VALUES (
      NEW.id,
      'VERIFICATION_CONFIRMED',
      'Verificatie bevestigd, planning gestart',
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dossiers_after_update_status
  AFTER UPDATE OF status ON public.dossiers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.fn_dossiers_after_update_status();

-- Also update fn_release_legal_hold to use TEXT casting
CREATE OR REPLACE FUNCTION public.fn_release_legal_hold(
  p_dossier_id UUID,
  p_actor UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_status TEXT;
  v_flow TEXT;
  v_restored_status TEXT;
BEGIN
  -- Haal gegevens op (cast to TEXT)
  SELECT legal_hold_prev_status, flow::TEXT
  INTO v_prev_status, v_flow
  FROM dossiers
  WHERE id = p_dossier_id;

  -- Bepaal status om naar terug te gaan
  v_restored_status := COALESCE(v_prev_status, 'PLANNING');

  -- Update legal hold record
  UPDATE legal_holds
  SET
    status = 'RELEASED',
    released_by = p_actor,
    released_at = NOW()
  WHERE dossier_id = p_dossier_id
    AND status = 'ACTIVE';

  -- Update dossier
  UPDATE dossiers
  SET
    legal_hold_active = false,
    status = v_restored_status::dossier_status,
    legal_hold_prev_status = NULL,
    legal_hold_authority = NULL,
    legal_hold_case_number = NULL
  WHERE id = p_dossier_id;

  -- Deblokkeer taken
  UPDATE kanban_tasks
  SET is_blocked = false
  WHERE dossier_id = p_dossier_id;

  -- Log event
  INSERT INTO dossier_events (
    dossier_id,
    event_type,
    event_description,
    created_by,
    metadata
  ) VALUES (
    p_dossier_id,
    'LEGAL_HOLD_RELEASED',
    'Juridische hold opgeheven',
    p_actor,
    jsonb_build_object(
      'reason', p_reason,
      'restored_status', v_restored_status
    )
  );

  -- Herseed taken indien nodig (idempotent, gebruik TEXT)
  PERFORM fn_seed_dossier_tasks_sql(p_dossier_id, v_flow, v_restored_status);
END;
$$;