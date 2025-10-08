-- =====================================================
-- DOSSIER STATUSMACHINE MET LEGAL_HOLD ONDERSTEUNING
-- =====================================================

-- A) SCHEMA: legal_holds tabel + dossier kolommen
-- =====================================================

-- Legal holds tabel voor parket/forensische holds
CREATE TABLE IF NOT EXISTS public.legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','RELEASED')),
  authority TEXT NOT NULL,
  case_number TEXT,
  reason TEXT,
  placed_by UUID REFERENCES public.profiles(id),
  released_by UUID REFERENCES public.profiles(id),
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_legal_holds_dossier ON public.legal_holds(dossier_id, status);

-- Kolommen op dossiers voor snelle legal hold checks
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS legal_hold_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_hold_prev_status TEXT,
  ADD COLUMN IF NOT EXISTS legal_hold_authority TEXT,
  ADD COLUMN IF NOT EXISTS legal_hold_case_number TEXT;

-- Optionele kolom op kanban_tasks voor blokkering tijdens hold
ALTER TABLE public.kanban_tasks
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- B) OPRUIMEN OUDE TRIGGERS
-- =====================================================

-- Drop oude trigger_seed_dossier_tasks functie/trigger (pg_net dependency)
DROP TRIGGER IF EXISTS trg_seed_dossier_tasks ON public.dossiers;
DROP FUNCTION IF EXISTS public.trigger_seed_dossier_tasks() CASCADE;

-- Drop oude triggers als ze bestaan
DROP TRIGGER IF EXISTS trg_dossiers_before_insert_status ON public.dossiers;
DROP TRIGGER IF EXISTS trg_dossiers_after_insert_seed ON public.dossiers;
DROP TRIGGER IF EXISTS trg_dossiers_before_update_flow ON public.dossiers;
DROP TRIGGER IF EXISTS trg_dossiers_after_update_flow ON public.dossiers;
DROP TRIGGER IF EXISTS trg_dossiers_after_update_status ON public.dossiers;
DROP TRIGGER IF EXISTS trg_dossiers_legal_hold_guard ON public.dossiers;

-- C) TASK SEEDING FUNCTIE (IDEMPOTENT)
-- =====================================================

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

  -- Seed taken op basis van flow
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

-- D) STATUSMACHINE TRIGGERS
-- =====================================================

-- 1. BEFORE INSERT: zet juiste status op basis van flow
CREATE OR REPLACE FUNCTION public.fn_dossiers_before_insert_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Als flow is LOC of REP en status is null/CREATED → INTAKE_IN_PROGRESS
  IF NEW.flow IN ('LOC', 'REP') AND (NEW.status IS NULL OR NEW.status = 'CREATED') THEN
    NEW.status := 'INTAKE_IN_PROGRESS';
  ELSE
    NEW.status := COALESCE(NEW.status, 'CREATED');
  END IF;

  -- Zorg dat assignment_status gezet is
  NEW.assignment_status := COALESCE(NEW.assignment_status, 'ASSIGNED');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dossiers_before_insert_status
  BEFORE INSERT ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_dossiers_before_insert_status();

-- 2. AFTER INSERT: log events en seed taken
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
  IF NEW.flow IN ('LOC', 'REP') THEN
    INSERT INTO dossier_events (
      dossier_id,
      event_type,
      event_description,
      created_by,
      metadata
    ) VALUES (
      NEW.id,
      'FLOW_SELECTED',
      'Flow geselecteerd: ' || NEW.flow,
      auth.uid(),
      jsonb_build_object('from', 'UNSET', 'to', NEW.flow)
    );

    -- Seed taken
    PERFORM fn_seed_dossier_tasks_sql(NEW.id, NEW.flow, NEW.status);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dossiers_after_insert_seed
  AFTER INSERT ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_dossiers_after_insert_seed();

-- 3. BEFORE UPDATE OF flow: wijzig status naar INTAKE_IN_PROGRESS als nodig
CREATE OR REPLACE FUNCTION public.fn_dossiers_before_update_flow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Als flow wijzigt naar LOC/REP en oude status was CREATED → INTAKE_IN_PROGRESS
  IF OLD.flow IS DISTINCT FROM NEW.flow
     AND NEW.flow IN ('LOC', 'REP')
     AND COALESCE(OLD.status, 'CREATED') = 'CREATED' THEN
    NEW.status := 'INTAKE_IN_PROGRESS';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dossiers_before_update_flow
  BEFORE UPDATE OF flow ON public.dossiers
  FOR EACH ROW
  WHEN (OLD.flow IS DISTINCT FROM NEW.flow)
  EXECUTE FUNCTION public.fn_dossiers_before_update_flow();

-- 4. AFTER UPDATE OF flow: log FLOW_SELECTED en seed taken
CREATE OR REPLACE FUNCTION public.fn_dossiers_after_update_flow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Als flow wijzigt naar LOC/REP
  IF OLD.flow IS DISTINCT FROM NEW.flow AND NEW.flow IN ('LOC', 'REP') THEN
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
      'Flow gewijzigd naar ' || NEW.flow,
      auth.uid(),
      jsonb_build_object(
        'from', COALESCE(OLD.flow::TEXT, 'UNSET'),
        'to', NEW.flow
      )
    );

    -- Seed taken
    PERFORM fn_seed_dossier_tasks_sql(NEW.id, NEW.flow, NEW.status);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dossiers_after_update_flow
  AFTER UPDATE OF flow ON public.dossiers
  FOR EACH ROW
  WHEN (OLD.flow IS DISTINCT FROM NEW.flow)
  EXECUTE FUNCTION public.fn_dossiers_after_update_flow();

-- 5. AFTER UPDATE OF status: log events en seed taken bij specifieke transities
CREATE OR REPLACE FUNCTION public.fn_dossiers_after_update_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seed taken bij INTAKE_IN_PROGRESS of DOCS_PENDING (idempotent)
  IF NEW.status IN ('INTAKE_IN_PROGRESS', 'DOCS_PENDING') THEN
    PERFORM fn_seed_dossier_tasks_sql(NEW.id, NEW.flow, NEW.status);
  END IF;

  -- Log INTAKE_COMPLETE wanneer status DOCS_VERIFIED wordt
  IF NEW.status = 'DOCS_VERIFIED' AND OLD.status IS DISTINCT FROM NEW.status THEN
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
  IF NEW.status = 'PLANNING' AND OLD.status IS DISTINCT FROM NEW.status THEN
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

-- E) LEGAL_HOLD FUNCTIES
-- =====================================================

-- Plaats legal hold
CREATE OR REPLACE FUNCTION public.fn_place_legal_hold(
  p_dossier_id UUID,
  p_authority TEXT,
  p_case_number TEXT,
  p_reason TEXT,
  p_actor UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_status TEXT;
BEGIN
  -- Haal huidige status op
  SELECT status INTO v_prev_status
  FROM dossiers
  WHERE id = p_dossier_id;

  -- Maak legal hold record
  INSERT INTO legal_holds (
    dossier_id,
    status,
    authority,
    case_number,
    reason,
    placed_by
  ) VALUES (
    p_dossier_id,
    'ACTIVE',
    p_authority,
    p_case_number,
    p_reason,
    p_actor
  );

  -- Update dossier
  UPDATE dossiers
  SET
    legal_hold_active = true,
    legal_hold_prev_status = v_prev_status,
    legal_hold_authority = p_authority,
    legal_hold_case_number = p_case_number,
    status = 'LEGAL_HOLD'
  WHERE id = p_dossier_id;

  -- Blokkeer alle open taken
  UPDATE kanban_tasks
  SET is_blocked = true
  WHERE dossier_id = p_dossier_id
    AND status != 'DONE';

  -- Log event
  INSERT INTO dossier_events (
    dossier_id,
    event_type,
    event_description,
    created_by,
    metadata
  ) VALUES (
    p_dossier_id,
    'LEGAL_HOLD_PLACED',
    'Dossier onder juridische hold geplaatst',
    p_actor,
    jsonb_build_object(
      'authority', p_authority,
      'case_number', p_case_number,
      'reason', p_reason,
      'previous_status', v_prev_status
    )
  );
END;
$$;

-- Hef legal hold op
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
  -- Haal gegevens op
  SELECT legal_hold_prev_status, flow
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
    status = v_restored_status,
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

  -- Herseed taken indien nodig (idempotent)
  PERFORM fn_seed_dossier_tasks_sql(p_dossier_id, v_flow, v_restored_status);
END;
$$;

-- F) LEGAL_HOLD GUARDS
-- =====================================================

-- Guard: blokkeer risicovolle status transities tijdens LEGAL_HOLD
CREATE OR REPLACE FUNCTION public.fn_dossiers_legal_hold_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Als dossier onder legal hold staat
  IF NEW.legal_hold_active = true THEN
    -- Alleen LEGAL_HOLD, DOCS_PENDING, DOCS_VERIFIED zijn toegestaan
    IF NEW.status NOT IN ('LEGAL_HOLD', 'DOCS_PENDING', 'DOCS_VERIFIED') THEN
      RAISE EXCEPTION 'Dossier staat onder LEGAL_HOLD: transport en planning zijn geblokkeerd tot vrijgave. Huidige hold: % (zaak: %)',
        NEW.legal_hold_authority,
        NEW.legal_hold_case_number
        USING HINT = 'Gebruik fn_release_legal_hold() om de hold op te heffen.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dossiers_legal_hold_guard
  BEFORE UPDATE OF status ON public.dossiers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.fn_dossiers_legal_hold_guard();

-- G) RLS POLICIES VOOR LEGAL_HOLDS
-- =====================================================

ALTER TABLE public.legal_holds ENABLE ROW LEVEL SECURITY;

-- Admin en FD kunnen legal holds zien
CREATE POLICY "Users can view legal holds for their dossiers"
  ON public.legal_holds
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'platform_admin'::app_role)
    OR (
      has_role(auth.uid(), 'funeral_director'::app_role)
      AND dossier_id IN (
        SELECT id FROM dossiers
        WHERE assigned_fd_org_id IN (
          SELECT organization_id
          FROM user_roles
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Alleen admin kan legal holds plaatsen/vrijgeven (via functies)
CREATE POLICY "Only admins can manage legal holds"
  ON public.legal_holds
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'platform_admin'::app_role)
  );

-- GEREED: statusmachine met LEGAL_HOLD ondersteuning geïmplementeerd