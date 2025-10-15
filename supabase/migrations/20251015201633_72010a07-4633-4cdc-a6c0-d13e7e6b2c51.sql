-- Fix ALL functions that use 'DONE' to use 'AFGEROND' instead

-- 1. Fix archive_dossier_tasks
CREATE OR REPLACE FUNCTION archive_dossier_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'CLOSED' AND (OLD.status IS DISTINCT FROM 'CLOSED') THEN
    UPDATE kanban_tasks
    SET status = 'AFGEROND'
    WHERE dossier_id = NEW.id
      AND status != 'AFGEROND';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Fix auto_complete_tasks
CREATE OR REPLACE FUNCTION auto_complete_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-complete based on the trigger table
  IF TG_TABLE_NAME = 'documents' AND NEW.status = 'APPROVED' THEN
    -- Map document types to task types
    UPDATE kanban_tasks
    SET status = 'AFGEROND', completed_at = NOW()
    WHERE dossier_id = NEW.dossier_id
      AND status != 'AFGEROND'
      AND (
        (NEW.doc_type = 'OVERLIJDENSAKTE' AND task_type = 'INTAKE_DEATH_CERTIFICATE') OR
        (NEW.doc_type = 'ID_PASPOORT' AND task_type = 'INTAKE_ID_DOCUMENT') OR
        (NEW.doc_type = 'PASPOORT_OVERLEDENE' AND task_type = 'INTAKE_PASSPORT_DECEASED') OR
        (NEW.doc_type = 'BEGRAAFAKTE' AND task_type = 'SETTLE_BURIAL_CERTIFICATE')
      );
  
  ELSIF TG_TABLE_NAME = 'claims' AND NEW.status IN ('APPROVED', 'MANUAL_OVERRIDE') THEN
    UPDATE kanban_tasks
    SET status = 'AFGEROND', completed_at = NOW()
    WHERE dossier_id = NEW.dossier_id
      AND status != 'AFGEROND'
      AND task_type = 'VERIFY_INSURANCE';
  
  ELSIF TG_TABLE_NAME = 'invoices' AND NEW.status = 'SENT' THEN
    UPDATE kanban_tasks
    SET status = 'AFGEROND', completed_at = NOW()
    WHERE dossier_id = NEW.dossier_id
      AND status != 'AFGEROND'
      AND (
        (NEW.invoice_type = 'FD' AND task_type = 'SETTLE_FD_INVOICE') OR
        (NEW.invoice_type = 'WASPLAATS' AND task_type = 'SETTLE_MORTUARY_INVOICE')
      );
  
  ELSIF TG_TABLE_NAME = 'flights' AND NEW.air_waybill IS NOT NULL THEN
    UPDATE kanban_tasks
    SET status = 'AFGEROND', completed_at = NOW()
    WHERE dossier_id = NEW.dossier_id
      AND status != 'AFGEROND'
      AND task_type = 'EXECUTE_FLIGHT_BOOKING';
  
  ELSIF TG_TABLE_NAME = 'case_events' THEN
    -- Map event types to task types
    UPDATE kanban_tasks kt
    SET status = 'AFGEROND', completed_at = NOW()
    WHERE kt.dossier_id = NEW.dossier_id
      AND kt.status != 'AFGEROND'
      AND (
        (NEW.event_type = 'MOSQUE_SERVICE' AND NEW.status = 'PLANNED' AND kt.task_type = 'PREP_MOSQUE') OR
        (NEW.event_type = 'BURIAL' AND NEW.status = 'PLANNED' AND kt.task_type = 'PREP_BURIAL') OR
        (NEW.event_type = 'PICKUP' AND NEW.status = 'PLANNED' AND kt.task_type = 'PREP_TRANSPORT') OR
        (NEW.event_type = 'PICKUP' AND NEW.status = 'AFGEROND' AND kt.task_type = 'EXECUTE_PICKUP') OR
        (NEW.event_type = 'MORTUARY_SERVICE' AND NEW.status = 'AFGEROND' AND kt.task_type = 'EXECUTE_MORTUARY') OR
        (NEW.event_type = 'MOSQUE_SERVICE' AND NEW.status = 'AFGEROND' AND kt.task_type = 'EXECUTE_MOSQUE') OR
        (NEW.event_type = 'BURIAL' AND NEW.status = 'AFGEROND' AND kt.task_type = 'EXECUTE_BURIAL')
      );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Fix check_and_progress_dossier
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
  
  -- Tel open taken voor huidige status (gebruik AFGEROND ipv DONE)
  SELECT COUNT(*) INTO v_open_tasks_count
  FROM kanban_tasks
  WHERE dossier_id = p_dossier_id
    AND status != 'AFGEROND';
  
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
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Onbekende huidige status');
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

-- 4. Fix fn_check_progress_on_task_done
CREATE OR REPLACE FUNCTION public.fn_check_progress_on_task_done()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Als een taak op AFGEROND wordt gezet, check auto-progressie (gebruik AFGEROND ipv DONE)
  IF NEW.status = 'AFGEROND' AND OLD.status != 'AFGEROND' THEN
    PERFORM check_and_progress_dossier(NEW.dossier_id);
  END IF;
  
  RETURN NEW;
END;
$$;