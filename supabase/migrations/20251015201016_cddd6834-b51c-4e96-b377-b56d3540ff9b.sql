-- Fix auto_complete_insurance_verification to use correct Dutch status
DROP FUNCTION IF EXISTS auto_complete_insurance_verification() CASCADE;

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
    SET status = 'AFGEROND', completed_at = NOW()
    WHERE dossier_id = NEW.dossier_id
      AND status != 'AFGEROND'
      AND task_type = 'VERIFY_INSURANCE';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_auto_complete_insurance ON claims;
CREATE TRIGGER trigger_auto_complete_insurance
  AFTER UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_insurance_verification();