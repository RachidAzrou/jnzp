-- Fix trigger functions that reference 'ARCHIVED' status (which doesn't exist in simple_dossier_status enum)

-- Drop oude functies met CASCADE
DROP FUNCTION IF EXISTS notify_family_on_dossier_completion() CASCADE;
DROP FUNCTION IF EXISTS notify_mortuarium_on_dossier_completion() CASCADE;

-- Recreate notify_family_on_dossier_completion zonder 'ARCHIVED'
CREATE OR REPLACE FUNCTION notify_family_on_dossier_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  family_user_id UUID;
BEGIN
  -- When dossier status changes to a final state (WITHOUT 'ARCHIVED')
  IF NEW.status IN ('COMPLETED', 'CLOSED') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('COMPLETED', 'CLOSED')) THEN
    
    -- Notify family members
    FOR family_user_id IN SELECT * FROM get_family_users_for_dossier(NEW.id)
    LOOP
      PERFORM create_notification(
        family_user_id,
        'FAMILY_DOSSIER_COMPLETED',
        jsonb_build_object(
          'dossier_id', NEW.id,
          'deceased_name', NEW.deceased_name,
          'ref', NEW.display_id
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate notify_mortuarium_on_dossier_completion zonder 'ARCHIVED'
CREATE OR REPLACE FUNCTION notify_mortuarium_on_dossier_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mortuarium_user_id UUID;
  mortuarium_org_id UUID;
BEGIN
  -- When dossier status changes to a final state (WITHOUT 'ARCHIVED')
  IF NEW.status IN ('COMPLETED', 'CLOSED') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('COMPLETED', 'CLOSED')) THEN
    
    -- Get mortuarium org id
    SELECT (metadata->>'mortuarium_org_id')::UUID INTO mortuarium_org_id
    FROM case_events
    WHERE dossier_id = NEW.id
      AND event_type = 'MORTUARIUM_RESERVATION'
    LIMIT 1;
    
    -- Notify mortuarium users if there was a mortuarium involved
    IF mortuarium_org_id IS NOT NULL THEN
      FOR mortuarium_user_id IN SELECT * FROM get_mortuarium_users_for_org(mortuarium_org_id)
      LOOP
        PERFORM create_notification(
          mortuarium_user_id,
          'MORTUARIUM_DOSSIER_COMPLETED',
          jsonb_build_object(
            'dossier_id', NEW.id,
            'deceased_name', NEW.deceased_name,
            'ref', NEW.display_id
          )
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers
DROP TRIGGER IF EXISTS trigger_notify_family_on_completion ON dossiers;
CREATE TRIGGER trigger_notify_family_on_completion
  AFTER UPDATE ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION notify_family_on_dossier_completion();

DROP TRIGGER IF EXISTS trigger_notify_mortuarium_on_completion ON dossiers;
CREATE TRIGGER trigger_notify_mortuarium_on_completion
  AFTER UPDATE ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION notify_mortuarium_on_dossier_completion();