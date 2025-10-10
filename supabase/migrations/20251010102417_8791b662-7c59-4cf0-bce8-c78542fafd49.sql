-- Fix audit_role_changes trigger to handle user deletion cascade
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_events (
      user_id,
      event_type,
      target_type,
      target_id,
      description,
      metadata
    ) VALUES (
      NEW.user_id,
      'ROLE_ASSIGNED',
      'UserRole',
      NEW.user_id,
      'Role assigned to user',
      jsonb_build_object(
        'role', NEW.role,
        'organization_id', NEW.organization_id
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_events (
      user_id,
      event_type,
      target_type,
      target_id,
      description,
      metadata,
      payload_diff
    ) VALUES (
      NEW.user_id,
      'ROLE_CHANGED',
      'UserRole',
      NEW.user_id,
      'User role changed',
      jsonb_build_object(
        'organization_id', NEW.organization_id
      ),
      jsonb_build_object(
        'from_role', OLD.role,
        'to_role', NEW.role
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    -- Only log if user still exists (not cascade delete from user deletion)
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) THEN
      INSERT INTO audit_events (
        user_id,
        event_type,
        target_type,
        target_id,
        description,
        metadata
      ) VALUES (
        OLD.user_id,
        'ROLE_REMOVED',
        'UserRole',
        OLD.user_id,
        'Role removed from user',
        jsonb_build_object(
          'role', OLD.role,
          'organization_id', OLD.organization_id
        )
      );
    END IF;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Now cleanup incomplete user registrations
-- 1. Delete user_roles with scope='ORG' but organization_id IS NULL
DELETE FROM public.user_roles
WHERE scope = 'ORG' 
  AND organization_id IS NULL;

-- 2. Delete auth.users without corresponding user_roles (incomplete registrations older than 1 day)
DELETE FROM auth.users
WHERE id IN (
  SELECT au.id
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  WHERE ur.user_id IS NULL
    AND au.created_at < NOW() - INTERVAL '1 day'
);