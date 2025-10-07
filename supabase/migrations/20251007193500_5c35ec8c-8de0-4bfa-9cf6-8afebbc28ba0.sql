-- Dossiers pagina: Views en functies voor FD dossier management

-- 1. View voor "Mijn dossiers" (FD org is toegewezen)
CREATE OR REPLACE VIEW view_my_dossiers AS
SELECT 
  d.*,
  fd_org.name as fd_org_name,
  ins_org.name as insurer_name,
  COUNT(DISTINCT doc.id) as document_count,
  COUNT(DISTINCT fc.id) as contact_count
FROM dossiers d
LEFT JOIN organizations fd_org ON d.assigned_fd_org_id = fd_org.id
LEFT JOIN organizations ins_org ON d.insurer_org_id = ins_org.id
LEFT JOIN documents doc ON d.id = doc.dossier_id
LEFT JOIN family_contacts fc ON d.id = fc.dossier_id
GROUP BY d.id, fd_org.name, ins_org.name;

-- 2. RPC: Tel claimbare dossiers voor huidige org
CREATE OR REPLACE FUNCTION count_claimable_dossiers()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM dossiers d
  WHERE d.assignment_status = 'UNASSIGNED'
    AND d.flow != 'UNSET'
    AND NOT EXISTS (
      SELECT 1 FROM dossier_claims dc
      WHERE dc.dossier_id = d.id
        AND dc.status = 'PENDING'
        AND dc.requesting_org_id IN (
          SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
        )
    );
$$;

-- 3. RPC: Claim een dossier
CREATE OR REPLACE FUNCTION claim_dossier(
  p_dossier_id uuid,
  p_note text DEFAULT NULL,
  p_require_family_approval boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_claim_id uuid;
  v_dossier record;
BEGIN
  -- Get current user and org
  v_user_id := auth.uid();
  
  SELECT organization_id INTO v_org_id
  FROM user_roles
  WHERE user_id = v_user_id
    AND role = 'funeral_director'
    AND is_active = true
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active funeral director organization found'
    );
  END IF;
  
  -- Check if dossier exists and is unassigned
  SELECT * INTO v_dossier
  FROM dossiers
  WHERE id = p_dossier_id
    AND assignment_status = 'UNASSIGNED';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Dossier not found or already assigned'
    );
  END IF;
  
  -- Check for existing pending claims
  IF EXISTS (
    SELECT 1 FROM dossier_claims
    WHERE dossier_id = p_dossier_id
      AND requesting_org_id = v_org_id
      AND status = 'PENDING'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Claim already pending for this dossier'
    );
  END IF;
  
  -- Create claim request
  INSERT INTO dossier_claims (
    dossier_id,
    requesting_org_id,
    requested_by,
    reason,
    status
  ) VALUES (
    p_dossier_id,
    v_org_id,
    v_user_id,
    p_note,
    CASE 
      WHEN p_require_family_approval THEN 'PENDING'
      ELSE 'APPROVED'
    END
  ) RETURNING id INTO v_claim_id;
  
  -- If no family approval needed, assign directly
  IF NOT p_require_family_approval THEN
    UPDATE dossiers
    SET 
      assigned_fd_org_id = v_org_id,
      assignment_status = 'ASSIGNED',
      updated_at = now()
    WHERE id = p_dossier_id;
    
    -- Log the event
    INSERT INTO dossier_events (
      dossier_id,
      event_type,
      event_description,
      created_by,
      metadata
    ) VALUES (
      p_dossier_id,
      'DOSSIER_CLAIMED',
      'Dossier claimed by funeral director',
      v_user_id,
      jsonb_build_object('claim_id', v_claim_id, 'org_id', v_org_id)
    );
  ELSE
    -- Log pending claim
    INSERT INTO dossier_events (
      dossier_id,
      event_type,
      event_description,
      created_by,
      metadata
    ) VALUES (
      p_dossier_id,
      'CLAIM_REQUESTED',
      'Claim requested, awaiting family approval',
      v_user_id,
      jsonb_build_object('claim_id', v_claim_id, 'org_id', v_org_id)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'requires_approval', p_require_family_approval
  );
END;
$$;

-- 4. RPC: Goedkeuren van claim (door familie via mobile app)
CREATE OR REPLACE FUNCTION approve_dossier_claim(
  p_claim_id uuid,
  p_approved boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim record;
BEGIN
  -- Get claim details
  SELECT * INTO v_claim
  FROM dossier_claims
  WHERE id = p_claim_id
    AND status = 'PENDING';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Claim not found or already processed'
    );
  END IF;
  
  IF p_approved THEN
    -- Approve claim
    UPDATE dossier_claims
    SET 
      status = 'APPROVED',
      decided_at = now(),
      decided_by = auth.uid()
    WHERE id = p_claim_id;
    
    -- Assign dossier
    UPDATE dossiers
    SET 
      assigned_fd_org_id = v_claim.requesting_org_id,
      assignment_status = 'ASSIGNED',
      updated_at = now()
    WHERE id = v_claim.dossier_id;
    
    -- Log event
    INSERT INTO dossier_events (
      dossier_id,
      event_type,
      event_description,
      created_by,
      metadata
    ) VALUES (
      v_claim.dossier_id,
      'CLAIM_APPROVED',
      'Claim approved by family',
      auth.uid(),
      jsonb_build_object('claim_id', p_claim_id)
    );
  ELSE
    -- Reject claim
    UPDATE dossier_claims
    SET 
      status = 'REJECTED',
      decided_at = now(),
      decided_by = auth.uid()
    WHERE id = p_claim_id;
    
    -- Log event
    INSERT INTO dossier_events (
      dossier_id,
      event_type,
      event_description,
      created_by,
      metadata
    ) VALUES (
      v_claim.dossier_id,
      'CLAIM_REJECTED',
      'Claim rejected by family',
      auth.uid(),
      jsonb_build_object('claim_id', p_claim_id)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'approved', p_approved
  );
END;
$$;

-- 5. Enable realtime for dossiers and claims
ALTER PUBLICATION supabase_realtime ADD TABLE dossiers;
ALTER PUBLICATION supabase_realtime ADD TABLE dossier_claims;