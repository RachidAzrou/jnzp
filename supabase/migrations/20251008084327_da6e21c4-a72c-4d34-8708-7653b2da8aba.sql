-- Update validate_status_transition to support REP flow
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

  -- ================= LOC FLOW =================
  IF v_dossier.flow = 'LOC' THEN
    CASE 
      WHEN v_dossier.status = 'CREATED' AND p_new_status = 'INTAKE' THEN
        v_required_tasks := ARRAY['INTAKE_WELCOME', 'INTAKE_FAMILY_CONTACT', 'INTAKE_GDPR'];
      
      WHEN v_dossier.status = 'INTAKE' AND p_new_status = 'VERIFY' THEN
        v_required_tasks := ARRAY['INTAKE_DEATH_CERTIFICATE', 'INTAKE_ID_DOCUMENT', 'INTAKE_FLOW_CONFIRM'];
      
      WHEN v_dossier.status = 'VERIFY' AND p_new_status = 'PREP' THEN
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
      
      WHEN v_dossier.status = 'PREP' AND p_new_status = 'EXECUTE' THEN
        v_required_tasks := ARRAY['PREP_MORTUARY', 'PREP_MOSQUE', 'PREP_BURIAL', 'PREP_TRANSPORT'];
      
      WHEN v_dossier.status = 'EXECUTE' AND p_new_status = 'SETTLE' THEN
        v_required_tasks := ARRAY['EXECUTE_PICKUP', 'EXECUTE_MORTUARY', 'EXECUTE_MOSQUE', 'EXECUTE_BURIAL'];
      
      WHEN v_dossier.status = 'SETTLE' AND p_new_status = 'CLOSED' THEN
        v_required_tasks := ARRAY['SETTLE_BURIAL_CERTIFICATE', 'SETTLE_FD_INVOICE', 'SETTLE_MORTUARY_INVOICE'];
        
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
        RETURN jsonb_build_object('allowed', true);
    END CASE;
  
  -- ================= REP FLOW =================
  ELSIF v_dossier.flow = 'REP' THEN
    CASE 
      WHEN v_dossier.status = 'CREATED' AND p_new_status = 'INTAKE' THEN
        v_required_tasks := ARRAY['INTAKE_WELCOME', 'INTAKE_FAMILY_CONTACT', 'INTAKE_GDPR'];
      
      WHEN v_dossier.status = 'INTAKE' AND p_new_status = 'VERIFY' THEN
        v_required_tasks := ARRAY['INTAKE_DEATH_CERTIFICATE', 'INTAKE_PASSPORT_DECEASED', 'INTAKE_FLOW_CONFIRM'];
      
      WHEN v_dossier.status = 'VERIFY' AND p_new_status = 'PREP' THEN
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
      
      WHEN v_dossier.status = 'PREP' AND p_new_status = 'EXECUTE' THEN
        v_required_tasks := ARRAY['PREP_MORTUARY', 'PREP_CONSULAR_DOCS', 'PREP_FLIGHT_PROPOSAL', 'PREP_EXPORT_CLEARANCE', 'PREP_RECEIVING_PARTNER'];
      
      WHEN v_dossier.status = 'EXECUTE' AND p_new_status = 'SETTLE' THEN
        v_required_tasks := ARRAY['EXECUTE_FLIGHT_BOOKING', 'EXECUTE_EXPORT', 'EXECUTE_FLIGHT_TRACKING', 'EXECUTE_PARTNER_HANDOVER'];
      
      WHEN v_dossier.status = 'SETTLE' AND p_new_status = 'CLOSED' THEN
        v_required_tasks := ARRAY['SETTLE_REPATRIATION_DOCS', 'SETTLE_FD_INVOICE', 'SETTLE_MORTUARY_INVOICE', 'SETTLE_CLAIM_SETTLEMENT'];
        
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
        RETURN jsonb_build_object('allowed', true);
    END CASE;
  
  ELSE
    -- Unknown flow, allow transition
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Check if all required tasks are done
  IF v_required_tasks IS NOT NULL THEN
    SELECT array_agg(required_task)
    INTO v_missing_tasks
    FROM unnest(v_required_tasks) AS required_task
    WHERE NOT EXISTS (
      SELECT 1 FROM kanban_tasks
      WHERE dossier_id = p_dossier_id 
      AND task_type = required_task
      AND status = 'DONE'
    );

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

-- Add auto-complete trigger for flights table
CREATE TRIGGER auto_complete_tasks_from_flights
  AFTER INSERT OR UPDATE ON flights
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_tasks();