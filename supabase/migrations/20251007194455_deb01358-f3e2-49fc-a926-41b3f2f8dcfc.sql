-- RPC functie voor het afhandelen van FD requests (accept/reject)
CREATE OR REPLACE FUNCTION public.handle_fd_request(
  p_claim_id uuid,
  p_approved boolean,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_claim RECORD;
  v_dossier_id uuid;
  v_requesting_org_id uuid;
BEGIN
  -- Get claim info
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
  
  v_dossier_id := v_claim.dossier_id;
  v_requesting_org_id := v_claim.requesting_org_id;
  
  IF p_approved THEN
    -- ACCEPT: Assign dossier to requesting FD org
    UPDATE dossiers
    SET 
      assigned_fd_org_id = v_requesting_org_id,
      assignment_status = 'ASSIGNED',
      updated_at = now()
    WHERE id = v_dossier_id;
    
    -- Update claim status
    UPDATE dossier_claims
    SET 
      status = 'APPROVED',
      decided_at = now(),
      decided_by = auth.uid()
    WHERE id = p_claim_id;
    
    -- Audit log
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
      'FD_REQUEST_ACCEPTED',
      'Dossier',
      v_dossier_id,
      v_dossier_id,
      'FD request accepted - dossier assigned',
      jsonb_build_object(
        'claim_id', p_claim_id,
        'assigned_to_org', v_requesting_org_id
      )
    );
  ELSE
    -- REJECT: Keep dossier unassigned (available for other FDs to claim)
    UPDATE dossiers
    SET 
      assignment_status = 'UNASSIGNED',
      updated_at = now()
    WHERE id = v_dossier_id;
    
    -- Update claim status
    UPDATE dossier_claims
    SET 
      status = 'REJECTED',
      decided_at = now(),
      decided_by = auth.uid(),
      reason = p_rejection_reason
    WHERE id = p_claim_id;
    
    -- Audit log
    INSERT INTO audit_events (
      user_id,
      event_type,
      target_type,
      target_id,
      dossier_id,
      description,
      metadata,
      reason
    ) VALUES (
      auth.uid(),
      'FD_REQUEST_REJECTED',
      'Dossier',
      v_dossier_id,
      v_dossier_id,
      'FD request rejected - dossier remains unassigned',
      jsonb_build_object(
        'claim_id', p_claim_id,
        'rejected_org', v_requesting_org_id
      ),
      p_rejection_reason
    );
    
    -- TODO: Stuur notificatie naar nabestaande dat FD heeft geweigerd
    -- Dit kan later via een edge function of notification systeem
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'dossier_id', v_dossier_id,
    'approved', p_approved
  );
END;
$$;