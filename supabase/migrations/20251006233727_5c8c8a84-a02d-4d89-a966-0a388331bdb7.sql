-- Add assignment_status to dossiers table
ALTER TABLE dossiers
  ADD COLUMN IF NOT EXISTS assignment_status text NOT NULL DEFAULT 'ASSIGNED'
    CHECK (assignment_status IN ('ASSIGNED','UNASSIGNED','PENDING_CLAIM'));

-- Update existing records based on whether they have an assigned FD
UPDATE dossiers 
SET assignment_status = CASE 
  WHEN assigned_fd_org_id IS NOT NULL THEN 'ASSIGNED'
  ELSE 'UNASSIGNED'
END
WHERE assignment_status = 'ASSIGNED';

-- Create dossier_claims table
CREATE TABLE IF NOT EXISTS dossier_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  requesting_org_id uuid NOT NULL REFERENCES organizations(id),
  requested_by uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
  reason text,
  token text UNIQUE,
  expire_at timestamptz DEFAULT (now() + interval '48 hours'),
  decided_at timestamptz,
  decided_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on dossier_claims
ALTER TABLE dossier_claims ENABLE ROW LEVEL SECURITY;

-- Policies for dossier_claims
CREATE POLICY "FD can view their own claims"
ON dossier_claims
FOR SELECT
USING (
  has_role(auth.uid(), 'funeral_director'::app_role) AND
  requesting_org_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
);

CREATE POLICY "FD can create claims for unassigned dossiers"
ON dossier_claims
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'funeral_director'::app_role) AND
  auth.uid() = requested_by AND
  requesting_org_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()) AND
  EXISTS (
    SELECT 1 FROM dossiers 
    WHERE id = dossier_id 
    AND assignment_status = 'UNASSIGNED'
  )
);

CREATE POLICY "System can update claims"
ON dossier_claims
FOR UPDATE
USING (true);

-- Create dossier_release_events table
CREATE TABLE IF NOT EXISTS dossier_release_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('FD_RELEASE','FAMILY_RELEASE')),
  reason text,
  actor_user_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on dossier_release_events
ALTER TABLE dossier_release_events ENABLE ROW LEVEL SECURITY;

-- Policies for dossier_release_events
CREATE POLICY "FD and family can view release events"
ON dossier_release_events
FOR SELECT
USING (
  has_role(auth.uid(), 'funeral_director'::app_role) OR
  has_role(auth.uid(), 'family'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "FD can create FD_RELEASE events"
ON dossier_release_events
FOR INSERT
WITH CHECK (
  action = 'FD_RELEASE' AND
  has_role(auth.uid(), 'funeral_director'::app_role) AND
  actor_user_id = auth.uid() AND
  reason IS NOT NULL
);

CREATE POLICY "Family can create FAMILY_RELEASE events"
ON dossier_release_events
FOR INSERT
WITH CHECK (
  action = 'FAMILY_RELEASE' AND
  has_role(auth.uid(), 'family'::app_role) AND
  actor_user_id = auth.uid()
);

-- Function to release dossier (FD or family)
CREATE OR REPLACE FUNCTION release_dossier(
  p_dossier_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dossier RECORD;
  v_old_fd_org_id uuid;
BEGIN
  -- Get dossier info
  SELECT * INTO v_dossier
  FROM dossiers
  WHERE id = p_dossier_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dossier not found');
  END IF;
  
  -- Validate action
  IF p_action NOT IN ('FD_RELEASE', 'FAMILY_RELEASE') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;
  
  -- For FD_RELEASE, reason is mandatory
  IF p_action = 'FD_RELEASE' AND (p_reason IS NULL OR p_reason = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required for FD release');
  END IF;
  
  v_old_fd_org_id := v_dossier.assigned_fd_org_id;
  
  -- Release the dossier
  UPDATE dossiers
  SET 
    assigned_fd_org_id = NULL,
    assignment_status = 'UNASSIGNED',
    updated_at = now()
  WHERE id = p_dossier_id;
  
  -- Log the release event
  INSERT INTO dossier_release_events (dossier_id, action, reason, actor_user_id)
  VALUES (p_dossier_id, p_action, p_reason, auth.uid());
  
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
    p_action,
    'Dossier',
    p_dossier_id,
    p_dossier_id,
    CASE 
      WHEN p_action = 'FD_RELEASE' THEN 'FD released dossier'
      ELSE 'Family released FD from dossier'
    END,
    jsonb_build_object(
      'old_fd_org_id', v_old_fd_org_id,
      'reason', p_reason
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'dossier_id', p_dossier_id,
    'old_fd_org_id', v_old_fd_org_id
  );
END;
$$;

-- Function to approve claim
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
  v_claim RECORD;
  v_new_status text;
BEGIN
  -- Get claim info
  SELECT * INTO v_claim
  FROM dossier_claims
  WHERE id = p_claim_id
  AND status = 'PENDING';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim not found or already decided');
  END IF;
  
  v_new_status := CASE WHEN p_approved THEN 'APPROVED' ELSE 'REJECTED' END;
  
  -- Update claim
  UPDATE dossier_claims
  SET 
    status = v_new_status,
    decided_at = now(),
    decided_by = auth.uid()
  WHERE id = p_claim_id;
  
  -- If approved, assign dossier to requesting org
  IF p_approved THEN
    UPDATE dossiers
    SET 
      assigned_fd_org_id = v_claim.requesting_org_id,
      assignment_status = 'ASSIGNED',
      updated_at = now()
    WHERE id = v_claim.dossier_id;
    
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
      'DOSSIER_CLAIM_APPROVED',
      'Dossier',
      v_claim.dossier_id,
      v_claim.dossier_id,
      'Family approved FD claim for dossier',
      jsonb_build_object(
        'claiming_org_id', v_claim.requesting_org_id,
        'claimed_by', v_claim.requested_by
      )
    );
  ELSE
    -- Update dossier back to unassigned
    UPDATE dossiers
    SET assignment_status = 'UNASSIGNED'
    WHERE id = v_claim.dossier_id;
    
    -- Audit log
    INSERT INTO audit_events (
      user_id,
      event_type,
      target_type,
      target_id,
      dossier_id,
      description
    ) VALUES (
      auth.uid(),
      'DOSSIER_CLAIM_REJECTED',
      'Dossier',
      v_claim.dossier_id,
      v_claim.dossier_id,
      'Family rejected FD claim for dossier'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'claim_id', p_claim_id,
    'approved', p_approved
  );
END;
$$;

-- Trigger to update dossier status when claim is created
CREATE OR REPLACE FUNCTION handle_new_dossier_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update dossier to PENDING_CLAIM
  UPDATE dossiers
  SET assignment_status = 'PENDING_CLAIM'
  WHERE id = NEW.dossier_id;
  
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
    NEW.requested_by,
    'DOSSIER_CLAIM_REQUESTED',
    'Dossier',
    NEW.dossier_id,
    NEW.dossier_id,
    'FD requested claim for dossier',
    jsonb_build_object(
      'claiming_org_id', NEW.requesting_org_id,
      'reason', NEW.reason
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_dossier_claim_created
  AFTER INSERT ON dossier_claims
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_dossier_claim();

-- Update existing dossiers RLS to account for assignment_status
DROP POLICY IF EXISTS "FD can view own organization dossiers" ON dossiers;

CREATE POLICY "FD can view own organization dossiers"
ON dossiers
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'funeral_director'::app_role) AND 
   user_org_is_approved(auth.uid()) AND 
   (assigned_fd_org_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()) OR
    assignment_status = 'UNASSIGNED'))
);