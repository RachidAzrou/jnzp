-- Create function to validate status transitions (guards)
CREATE OR REPLACE FUNCTION validate_status_transition(
  p_dossier_id UUID,
  p_new_status dossier_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dossier RECORD;
  v_required_tasks TEXT[];
  v_missing_tasks TEXT[];
  v_task RECORD;
BEGIN
  -- Get current dossier
  SELECT * INTO v_dossier
  FROM dossiers
  WHERE id = p_dossier_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Dossier not found'
    );
  END IF;

  -- Allow force close if flag is set
  IF p_new_status = 'CLOSED' AND v_dossier.allow_force_close THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'Force close enabled'
    );
  END IF;

  -- Define required tasks for each status transition
  CASE 
    -- CREATED -> INTAKE: tasks 1-3 must be done
    WHEN v_dossier.status = 'CREATED' AND p_new_status = 'INTAKE' THEN
      v_required_tasks := ARRAY['INTAKE_WELCOME', 'INTAKE_FAMILY_CONTACT', 'INTAKE_GDPR'];
    
    -- INTAKE -> VERIFY: tasks 4-7 must be done
    WHEN v_dossier.status = 'INTAKE' AND p_new_status = 'VERIFY' THEN
      v_required_tasks := ARRAY['INTAKE_DEATH_CERTIFICATE', 'INTAKE_ID_DOCUMENT', 'INTAKE_FLOW_CONFIRM'];
    
    -- VERIFY -> PREP: task 8 OR 9 must be done
    WHEN v_dossier.status = 'VERIFY' AND p_new_status = 'PREP' THEN
      -- Check if either insurance or offer is done
      IF EXISTS (
        SELECT 1 FROM kanban_tasks
        WHERE dossier_id = p_dossier_id
        AND task_type IN ('VERIFY_INSURANCE', 'VERIFY_OFFER')
        AND status = 'DONE'
      ) THEN
        RETURN jsonb_build_object('allowed', true);
      ELSE
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'Either insurance verification or offer must be completed',
          'missing_tasks', ARRAY['VERIFY_INSURANCE or VERIFY_OFFER']
        );
      END IF;
    
    -- PREP -> EXECUTE: tasks 10-13 must be done
    WHEN v_dossier.status = 'PREP' AND p_new_status = 'EXECUTE' THEN
      v_required_tasks := ARRAY['PREP_MORTUARY', 'PREP_MOSQUE', 'PREP_BURIAL', 'PREP_TRANSPORT'];
    
    -- EXECUTE -> SETTLE: tasks 15-18 must be done
    WHEN v_dossier.status = 'EXECUTE' AND p_new_status = 'SETTLE' THEN
      v_required_tasks := ARRAY['EXECUTE_PICKUP', 'EXECUTE_MORTUARY', 'EXECUTE_MOSQUE', 'EXECUTE_BURIAL'];
    
    -- SETTLE -> CLOSED: tasks 19-21 must be done
    WHEN v_dossier.status = 'SETTLE' AND p_new_status = 'CLOSED' THEN
      v_required_tasks := ARRAY['SETTLE_BURIAL_CERTIFICATE', 'SETTLE_FD_INVOICE', 'SETTLE_MORTUARY_INVOICE'];
      
      -- Also check that no tasks are TODO or IN_PROGRESS
      IF EXISTS (
        SELECT 1 FROM kanban_tasks
        WHERE dossier_id = p_dossier_id
        AND status IN ('TODO', 'IN_PROGRESS')
      ) THEN
        SELECT array_agg(title) INTO v_missing_tasks
        FROM kanban_tasks
        WHERE dossier_id = p_dossier_id
        AND status IN ('TODO', 'IN_PROGRESS');
        
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'Some tasks are still open',
          'missing_tasks', v_missing_tasks
        );
      END IF;
    
    ELSE
      -- No validation needed for other transitions
      RETURN jsonb_build_object('allowed', true);
  END CASE;

  -- Check if all required tasks are done
  IF v_required_tasks IS NOT NULL THEN
    SELECT array_agg(kt.title)
    INTO v_missing_tasks
    FROM unnest(v_required_tasks) AS required_task
    LEFT JOIN kanban_tasks kt ON 
      kt.dossier_id = p_dossier_id 
      AND kt.task_type = required_task
      AND kt.status = 'DONE'
    WHERE kt.id IS NULL;

    IF v_missing_tasks IS NOT NULL AND array_length(v_missing_tasks, 1) > 0 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Required tasks are not completed',
        'missing_tasks', v_missing_tasks
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Create trigger to seed tasks when dossier is created
CREATE OR REPLACE FUNCTION trigger_seed_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_response JSONB;
BEGIN
  -- Only seed for LOC flow for now
  IF NEW.flow = 'LOC' THEN
    -- Call edge function to seed tasks (async, don't wait for response)
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/seed-dossier-tasks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'dossierId', NEW.id,
        'status', NEW.status,
        'flow', NEW.flow
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on dossier insert and status update
CREATE TRIGGER seed_tasks_on_dossier_insert
  AFTER INSERT ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_seed_tasks();

CREATE TRIGGER seed_tasks_on_dossier_status_change
  AFTER UPDATE OF status ON dossiers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_seed_tasks();