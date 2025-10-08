-- Add BLOCKED status to claim_status enum
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'BLOCKED';

-- Add blocked_reason column to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS blocked_reason text;

-- Update RLS policy for insurers to update claims
DROP POLICY IF EXISTS "Insurers can update their claims" ON claims;
CREATE POLICY "Insurers can update their claims"
ON claims
FOR UPDATE
USING (
  insurer_org_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid() AND role = 'insurer'
  )
)
WITH CHECK (
  insurer_org_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid() AND role = 'insurer'
  )
);

-- Trigger to auto-complete FD tasks when claim is approved
CREATE OR REPLACE FUNCTION auto_complete_insurance_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-complete "Verzekering verifiëren" task when claim approved
  IF NEW.status IN ('API_APPROVED', 'MANUAL_APPROVED') AND 
     OLD.status != NEW.status THEN
    UPDATE kanban_tasks
    SET status = 'DONE', completed_at = NOW()
    WHERE dossier_id = NEW.dossier_id
      AND status != 'DONE'
      AND task_type = 'VERIFY_INSURANCE';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_complete_insurance ON claims;
CREATE TRIGGER trigger_auto_complete_insurance
AFTER UPDATE ON claims
FOR EACH ROW
EXECUTE FUNCTION auto_complete_insurance_verification();

-- Function to mark invoice as paid by insurer
CREATE OR REPLACE FUNCTION mark_invoice_paid(
  p_invoice_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_claim_id uuid;
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;
  
  -- Check if user is from the insurer org
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN dossiers d ON d.insurer_org_id = ur.organization_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'insurer'
      AND d.id = v_invoice.dossier_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Update invoice status
  UPDATE invoices
  SET status = 'PAID', updated_at = NOW()
  WHERE id = p_invoice_id;
  
  -- Log the payment action
  SELECT id INTO v_claim_id
  FROM claims
  WHERE dossier_id = v_invoice.dossier_id
  LIMIT 1;
  
  IF v_claim_id IS NOT NULL THEN
    INSERT INTO claim_actions (
      claim_id,
      user_id,
      action,
      reason,
      metadata
    ) VALUES (
      v_claim_id,
      auth.uid(),
      'PAYMENT_EXECUTED',
      p_reason,
      jsonb_build_object('invoice_id', p_invoice_id, 'amount', v_invoice.total)
    );
  END IF;
  
  -- Auto-complete "Claimafrekening opvolgen" task
  UPDATE kanban_tasks
  SET status = 'DONE', completed_at = NOW()
  WHERE dossier_id = v_invoice.dossier_id
    AND status != 'DONE'
    AND task_type = 'SETTLE_CLAIM_PAYMENT';
  
  -- Log event
  INSERT INTO dossier_events (
    dossier_id,
    event_type,
    event_description,
    created_by,
    metadata
  ) VALUES (
    v_invoice.dossier_id,
    'INVOICE_PAID',
    'Factuur betaald door verzekeraar',
    auth.uid(),
    jsonb_build_object('invoice_id', p_invoice_id, 'invoice_number', v_invoice.invoice_number)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;