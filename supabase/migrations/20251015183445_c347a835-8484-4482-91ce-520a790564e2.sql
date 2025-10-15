-- Helper function to get mortuarium users for an organization
CREATE OR REPLACE FUNCTION public.get_mortuarium_users_for_org(p_org_id UUID)
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ur.user_id
  FROM user_roles ur
  WHERE ur.organization_id = p_org_id
    AND ur.role = 'mortuarium';
END;
$$;

-- Trigger 1: FD creates mortuarium reservation (mortuarium notification)
CREATE OR REPLACE FUNCTION public.notify_mortuarium_new_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mortuarium_user_id UUID;
  dossier_rec RECORD;
BEGIN
  -- Only for new MORTUARIUM_RESERVATION events
  IF TG_OP = 'INSERT' AND NEW.event_type = 'MORTUARIUM_RESERVATION' THEN
    
    -- Get dossier info
    SELECT * INTO dossier_rec FROM dossiers WHERE id = NEW.dossier_id;
    
    -- Get mortuarium org id from metadata
    IF (NEW.metadata->>'mortuarium_org_id') IS NOT NULL THEN
      -- Notify mortuarium users
      FOR mortuarium_user_id IN 
        SELECT * FROM get_mortuarium_users_for_org((NEW.metadata->>'mortuarium_org_id')::UUID)
      LOOP
        PERFORM create_notification(
          mortuarium_user_id,
          'MORTUARIUM_NEW_RESERVATION',
          jsonb_build_object(
            'dossier_id', dossier_rec.id,
            'deceased_name', dossier_rec.deceased_name,
            'ref', dossier_rec.display_id,
            'event_id', NEW.id
          )
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_mortuarium_new_reservation
  AFTER INSERT ON public.case_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mortuarium_new_reservation();

-- Trigger 2 & 3: FD cancels or updates reservation (mortuarium notification)
CREATE OR REPLACE FUNCTION public.notify_mortuarium_reservation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mortuarium_user_id UUID;
  dossier_rec RECORD;
  fd_org_name TEXT;
  notification_type TEXT;
BEGIN
  -- Only for MORTUARIUM_RESERVATION events
  IF NEW.event_type = 'MORTUARIUM_RESERVATION' THEN
    
    -- Get dossier info
    SELECT * INTO dossier_rec FROM dossiers WHERE id = NEW.dossier_id;
    
    -- Get FD organization name
    SELECT name INTO fd_org_name
    FROM organizations
    WHERE id = dossier_rec.assigned_fd_org_id;
    
    -- Check if cancelled (status changed to CANCELLED)
    IF NEW.status = 'CANCELLED' AND (OLD.status IS NULL OR OLD.status != 'CANCELLED') THEN
      notification_type := 'MORTUARIUM_RESERVATION_CANCELLED';
      
      -- Notify mortuarium users
      IF (NEW.metadata->>'mortuarium_org_id') IS NOT NULL THEN
        FOR mortuarium_user_id IN 
          SELECT * FROM get_mortuarium_users_for_org((NEW.metadata->>'mortuarium_org_id')::UUID)
        LOOP
          PERFORM create_notification(
            mortuarium_user_id,
            notification_type,
            jsonb_build_object(
              'dossier_id', dossier_rec.id,
              'deceased_name', dossier_rec.deceased_name,
              'ref', dossier_rec.display_id,
              'fd_name', fd_org_name,
              'event_id', NEW.id
            )
          );
        END LOOP;
      END IF;
    
    -- Check if updated (any other field changed except status to CONFIRMED/CANCELLED)
    ELSIF NEW.status NOT IN ('CONFIRMED', 'CANCELLED') 
          AND (OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at 
               OR OLD.location_text IS DISTINCT FROM NEW.location_text
               OR OLD.metadata IS DISTINCT FROM NEW.metadata) THEN
      
      -- Notify mortuarium users
      IF (NEW.metadata->>'mortuarium_org_id') IS NOT NULL THEN
        FOR mortuarium_user_id IN 
          SELECT * FROM get_mortuarium_users_for_org((NEW.metadata->>'mortuarium_org_id')::UUID)
        LOOP
          PERFORM create_notification(
            mortuarium_user_id,
            'MORTUARIUM_RESERVATION_UPDATED',
            jsonb_build_object(
              'dossier_id', dossier_rec.id,
              'deceased_name', dossier_rec.deceased_name,
              'ref', dossier_rec.display_id,
              'fd_name', fd_org_name,
              'event_id', NEW.id
            )
          );
        END LOOP;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_mortuarium_reservation_change
  AFTER UPDATE ON public.case_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mortuarium_reservation_change();

-- Trigger 4: Reservation needs confirmation (pending status)
CREATE OR REPLACE FUNCTION public.notify_mortuarium_confirmation_needed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mortuarium_user_id UUID;
  dossier_rec RECORD;
BEGIN
  -- Only for MORTUARIUM_RESERVATION events with PENDING status
  IF NEW.event_type = 'MORTUARIUM_RESERVATION' 
     AND NEW.status = 'PENDING'
     AND (OLD.status IS NULL OR OLD.status != 'PENDING') THEN
    
    -- Get dossier info
    SELECT * INTO dossier_rec FROM dossiers WHERE id = NEW.dossier_id;
    
    -- Notify mortuarium users
    IF (NEW.metadata->>'mortuarium_org_id') IS NOT NULL THEN
      FOR mortuarium_user_id IN 
        SELECT * FROM get_mortuarium_users_for_org((NEW.metadata->>'mortuarium_org_id')::UUID)
      LOOP
        PERFORM create_notification(
          mortuarium_user_id,
          'MORTUARIUM_CONFIRMATION_NEEDED',
          jsonb_build_object(
            'dossier_id', dossier_rec.id,
            'deceased_name', dossier_rec.deceased_name,
            'ref', dossier_rec.display_id,
            'event_id', NEW.id
          )
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_mortuarium_confirmation_needed
  AFTER INSERT OR UPDATE ON public.case_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mortuarium_confirmation_needed();

-- Update existing message trigger to also notify mortuarium users
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  thread_rec RECORD;
BEGIN
  -- Get thread info
  SELECT * INTO thread_rec FROM threads WHERE id = NEW.thread_id;
  
  -- Get sender name
  SELECT display_name INTO sender_name 
  FROM profiles 
  WHERE id = NEW.sender_id;
  
  -- Notify all thread members except the sender
  FOR recipient_id IN 
    SELECT user_id FROM thread_members 
    WHERE thread_id = NEW.thread_id 
    AND user_id != NEW.sender_id
  LOOP
    PERFORM create_notification(
      recipient_id,
      'NEW_MESSAGE',
      jsonb_build_object(
        'thread_id', NEW.thread_id,
        'message_id', NEW.id,
        'sender_name', COALESCE(sender_name, 'Onbekend'),
        'message_preview', LEFT(NEW.content, 50),
        'dossier_id', thread_rec.dossier_id
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger 6: Dossier completed (mortuarium notification)
CREATE OR REPLACE FUNCTION public.notify_mortuarium_dossier_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mortuarium_user_id UUID;
  mortuarium_org_id UUID;
BEGIN
  -- When dossier status changes to a final state
  IF NEW.status IN ('COMPLETED', 'CLOSED', 'ARCHIVED') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('COMPLETED', 'CLOSED', 'ARCHIVED')) THEN
    
    -- Get mortuarium org id from any mortuarium reservation event for this dossier
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

CREATE TRIGGER trigger_notify_mortuarium_dossier_completed
  AFTER UPDATE ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mortuarium_dossier_completed();