-- Helper function to get family users for a dossier
CREATE OR REPLACE FUNCTION public.get_family_users_for_dossier(p_dossier_id UUID)
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ur.user_id
  FROM user_roles ur
  WHERE ur.role = 'family'
    AND ur.dossier_id = p_dossier_id;
END;
$$;

-- Trigger 1: FD accepts dossier (family notification)
CREATE OR REPLACE FUNCTION public.notify_family_fd_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  family_user_id UUID;
  fd_org_name TEXT;
BEGIN
  -- When FD is assigned and status changes to ASSIGNED
  IF NEW.assigned_fd_org_id IS NOT NULL 
     AND NEW.assignment_status = 'ASSIGNED' 
     AND (OLD.assignment_status IS NULL OR OLD.assignment_status != 'ASSIGNED') THEN
    
    -- Get FD organization name
    SELECT name INTO fd_org_name
    FROM organizations
    WHERE id = NEW.assigned_fd_org_id;
    
    -- Notify family members
    FOR family_user_id IN SELECT * FROM get_family_users_for_dossier(NEW.id)
    LOOP
      PERFORM create_notification(
        family_user_id,
        'FAMILY_FD_ACCEPTED',
        jsonb_build_object(
          'dossier_id', NEW.id,
          'deceased_name', NEW.deceased_name,
          'ref', NEW.display_id,
          'fd_name', fd_org_name
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_family_fd_accepted
  AFTER UPDATE ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_family_fd_accepted();

-- Trigger 2 & 3: FD claim rejected or approved (family notification)
CREATE OR REPLACE FUNCTION public.notify_family_fd_claim_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  family_user_id UUID;
  dossier_rec RECORD;
  fd_org_name TEXT;
  notification_type TEXT;
BEGIN
  -- Only when claim status changes to REJECTED or APPROVED
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('REJECTED', 'APPROVED') THEN
    
    -- Get dossier info
    SELECT * INTO dossier_rec FROM dossiers WHERE id = NEW.dossier_id;
    
    -- Get FD organization name
    SELECT name INTO fd_org_name
    FROM organizations
    WHERE id = NEW.requesting_org_id;
    
    -- Determine notification type
    IF NEW.status = 'REJECTED' THEN
      notification_type := 'FAMILY_FD_REJECTED';
    ELSE
      notification_type := 'FAMILY_FD_CLAIMED';
    END IF;
    
    -- Notify family members
    FOR family_user_id IN SELECT * FROM get_family_users_for_dossier(NEW.dossier_id)
    LOOP
      PERFORM create_notification(
        family_user_id,
        notification_type,
        jsonb_build_object(
          'dossier_id', dossier_rec.id,
          'deceased_name', dossier_rec.deceased_name,
          'ref', dossier_rec.display_id,
          'fd_name', fd_org_name
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_family_fd_claim_decision
  AFTER UPDATE ON public.dossier_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_family_fd_claim_decision();

-- Update existing insurance trigger to also notify family
CREATE OR REPLACE FUNCTION public.notify_insurance_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fd_user_id UUID;
  family_user_id UUID;
  dossier_rec RECORD;
  notification_type TEXT;
BEGIN
  -- Only when status changes to approved or rejected
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('API_APPROVED', 'MANUAL_APPROVED', 'REJECTED') THEN
    -- Get dossier info
    SELECT * INTO dossier_rec FROM dossiers WHERE id = NEW.dossier_id;
    
    -- Determine notification type
    IF NEW.status IN ('API_APPROVED', 'MANUAL_APPROVED') THEN
      notification_type := 'INSURANCE_APPROVED';
    ELSE
      notification_type := 'INSURANCE_REJECTED';
    END IF;
    
    -- Notify FD users
    IF dossier_rec.assigned_fd_org_id IS NOT NULL THEN
      FOR fd_user_id IN 
        SELECT user_id FROM user_roles 
        WHERE organization_id = dossier_rec.assigned_fd_org_id 
        AND role = 'funeral_director'
      LOOP
        PERFORM create_notification(
          fd_user_id,
          notification_type,
          jsonb_build_object(
            'dossier_id', dossier_rec.id,
            'deceased_name', dossier_rec.deceased_name,
            'ref', dossier_rec.display_id
          )
        );
      END LOOP;
    END IF;
    
    -- Notify family members
    FOR family_user_id IN SELECT * FROM get_family_users_for_dossier(NEW.dossier_id)
    LOOP
      PERFORM create_notification(
        family_user_id,
        CASE 
          WHEN NEW.status IN ('API_APPROVED', 'MANUAL_APPROVED') THEN 'FAMILY_INSURANCE_APPROVED'
          ELSE 'FAMILY_INSURANCE_REJECTED'
        END,
        jsonb_build_object(
          'dossier_id', dossier_rec.id,
          'deceased_name', dossier_rec.deceased_name,
          'ref', dossier_rec.display_id
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update existing mortuarium trigger to also notify family
CREATE OR REPLACE FUNCTION public.notify_mortuarium_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fd_user_id UUID;
  family_user_id UUID;
  dossier_rec RECORD;
  notification_type TEXT;
  mortuarium_name TEXT;
BEGIN
  -- Only for MORTUARIUM_RESERVATION events
  IF NEW.event_type = 'MORTUARIUM_RESERVATION' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get dossier info
    SELECT * INTO dossier_rec FROM dossiers WHERE id = NEW.dossier_id;
    
    -- Get mortuarium name
    SELECT name INTO mortuarium_name 
    FROM organizations 
    WHERE id = (NEW.metadata->>'mortuarium_org_id')::UUID;
    
    -- Determine notification type
    IF NEW.status = 'CONFIRMED' THEN
      notification_type := 'MORTUARIUM_CONFIRMED';
    ELSIF NEW.status = 'CANCELLED' THEN
      notification_type := 'MORTUARIUM_REJECTED';
    ELSE
      RETURN NEW; -- Don't notify for other status changes
    END IF;
    
    -- Notify FD users
    IF dossier_rec.assigned_fd_org_id IS NOT NULL THEN
      FOR fd_user_id IN 
        SELECT user_id FROM user_roles 
        WHERE organization_id = dossier_rec.assigned_fd_org_id 
        AND role = 'funeral_director'
      LOOP
        PERFORM create_notification(
          fd_user_id,
          notification_type,
          jsonb_build_object(
            'dossier_id', dossier_rec.id,
            'deceased_name', dossier_rec.deceased_name,
            'ref', dossier_rec.display_id,
            'mortuarium_name', mortuarium_name
          )
        );
      END LOOP;
    END IF;
    
    -- Notify family members
    FOR family_user_id IN SELECT * FROM get_family_users_for_dossier(NEW.dossier_id)
    LOOP
      PERFORM create_notification(
        family_user_id,
        CASE 
          WHEN NEW.status = 'CONFIRMED' THEN 'FAMILY_MORTUARIUM_CONFIRMED'
          ELSE 'FAMILY_MORTUARIUM_REJECTED'
        END,
        jsonb_build_object(
          'dossier_id', dossier_rec.id,
          'deceased_name', dossier_rec.deceased_name,
          'ref', dossier_rec.display_id,
          'mortuarium_name', mortuarium_name
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger 8: FD requests document (family notification)
CREATE OR REPLACE FUNCTION public.notify_family_document_requested()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  family_user_id UUID;
  dossier_rec RECORD;
  fd_org_name TEXT;
BEGIN
  -- Only when status changes to NEEDS_REUPLOAD
  IF NEW.status = 'NEEDS_REUPLOAD' AND (OLD.status IS NULL OR OLD.status != 'NEEDS_REUPLOAD') THEN
    
    -- Get dossier info
    SELECT * INTO dossier_rec FROM dossiers WHERE id = NEW.dossier_id;
    
    -- Get FD organization name
    SELECT name INTO fd_org_name
    FROM organizations
    WHERE id = dossier_rec.assigned_fd_org_id;
    
    -- Notify family members
    FOR family_user_id IN SELECT * FROM get_family_users_for_dossier(NEW.dossier_id)
    LOOP
      PERFORM create_notification(
        family_user_id,
        'FAMILY_DOCUMENT_REQUESTED',
        jsonb_build_object(
          'dossier_id', dossier_rec.id,
          'deceased_name', dossier_rec.deceased_name,
          'ref', dossier_rec.display_id,
          'fd_name', fd_org_name,
          'document_type', NEW.doc_type
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_family_document_requested
  AFTER UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_family_document_requested();

-- Update existing document upload trigger to also notify family
CREATE OR REPLACE FUNCTION public.notify_document_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fd_user_id UUID;
  family_user_id UUID;
  dossier_rec RECORD;
  uploader_role app_role;
BEGIN
  IF NEW.uploaded_by IS NOT NULL THEN
    -- Get uploader role
    SELECT role INTO uploader_role
    FROM user_roles 
    WHERE user_id = NEW.uploaded_by 
    LIMIT 1;
    
    -- Get dossier info
    SELECT * INTO dossier_rec FROM dossiers WHERE id = NEW.dossier_id;
    
    -- If uploaded by family, notify FD
    IF uploader_role = 'family' THEN
      IF dossier_rec.assigned_fd_org_id IS NOT NULL THEN
        FOR fd_user_id IN 
          SELECT user_id FROM user_roles 
          WHERE organization_id = dossier_rec.assigned_fd_org_id 
          AND role = 'funeral_director'
        LOOP
          PERFORM create_notification(
            fd_user_id,
            'DOCUMENT_UPLOADED',
            jsonb_build_object(
              'dossier_id', dossier_rec.id,
              'deceased_name', dossier_rec.deceased_name,
              'ref', dossier_rec.display_id,
              'document_name', NEW.file_name
            )
          );
        END LOOP;
      END IF;
    END IF;
    
    -- If uploaded by FD or insurer, notify family
    IF uploader_role IN ('funeral_director', 'insurer') THEN
      FOR family_user_id IN SELECT * FROM get_family_users_for_dossier(NEW.dossier_id)
      LOOP
        PERFORM create_notification(
          family_user_id,
          'FAMILY_DOCUMENT_AVAILABLE',
          jsonb_build_object(
            'dossier_id', dossier_rec.id,
            'deceased_name', dossier_rec.deceased_name,
            'ref', dossier_rec.display_id,
            'document_name', NEW.file_name
          )
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger 11: Dossier completed (family notification)
CREATE OR REPLACE FUNCTION public.notify_family_dossier_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  family_user_id UUID;
BEGIN
  -- When dossier status changes to a final state
  IF NEW.status IN ('COMPLETED', 'CLOSED', 'ARCHIVED') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('COMPLETED', 'CLOSED', 'ARCHIVED')) THEN
    
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

CREATE TRIGGER trigger_notify_family_dossier_completed
  AFTER UPDATE ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_family_dossier_completed();