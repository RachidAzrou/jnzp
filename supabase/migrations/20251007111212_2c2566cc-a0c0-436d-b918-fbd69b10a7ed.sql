-- Ensure organizations table has proper constraints
ALTER TABLE organizations
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN name SET NOT NULL;

-- Add constraint to ensure type is one of valid values if not already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organizations_type_check'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_type_check 
      CHECK (type IN ('FUNERAL_DIRECTOR','MOSQUE','WASPLAATS','INSURER'));
  END IF;
END $$;

-- Update existing trigger to ensure it works for all org types
CREATE OR REPLACE FUNCTION handle_new_org_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_metadata JSONB;
  v_requested_role app_role;
BEGIN
  -- Get user metadata to check requested role
  SELECT raw_user_meta_data INTO v_user_metadata
  FROM auth.users
  WHERE id = NEW.requested_by;
  
  v_requested_role := (v_user_metadata->>'role')::app_role;
  
  -- If user requested a professional role, assign roles for the new organization
  IF v_requested_role IN ('funeral_director', 'mosque', 'wasplaats', 'insurer') THEN
    -- First, remove the default 'family' role if it exists
    DELETE FROM user_roles 
    WHERE user_id = NEW.requested_by 
      AND role = 'family';
    
    -- Delete any existing roles without organization (from signup)
    DELETE FROM user_roles
    WHERE user_id = NEW.requested_by
      AND organization_id IS NULL;
    
    -- Assign org_admin role for this organization
    INSERT INTO user_roles (user_id, organization_id, role)
    VALUES (NEW.requested_by, NEW.id, 'org_admin')
    ON CONFLICT (user_id, role) DO UPDATE
    SET organization_id = NEW.id;
    
    -- Also assign the specific professional role
    INSERT INTO user_roles (user_id, organization_id, role)
    VALUES (NEW.requested_by, NEW.id, v_requested_role)
    ON CONFLICT (user_id, role) DO UPDATE
    SET organization_id = NEW.id;
    
    -- Audit log
    INSERT INTO audit_events (
      user_id,
      event_type,
      target_type,
      target_id,
      description,
      metadata
    ) VALUES (
      NEW.requested_by,
      'ORG_REGISTRATION_WITH_ROLE',
      'Organization',
      NEW.id,
      'User registered with organization and role',
      jsonb_build_object(
        'org_name', NEW.name,
        'org_type', NEW.type,
        'role', v_requested_role
      )
    );
  ELSE
    -- For non-professional roles, just assign org_admin
    INSERT INTO user_roles (user_id, organization_id, role)
    VALUES (NEW.requested_by, NEW.id, 'org_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;