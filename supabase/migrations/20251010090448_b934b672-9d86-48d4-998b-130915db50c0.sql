-- Fix: Replace 'wasplaats' with 'mortuarium' in auth triggers
-- This fixes the "invalid input value for enum app_role: 'wasplaats'" error during registration

-- Fix 1: Update handle_new_user_role to map wasplaats → mortuarium
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_role_string TEXT;
BEGIN
  -- Get role from metadata as string first
  v_role_string := NEW.raw_user_meta_data->>'role';
  
  -- Map 'wasplaats' to 'mortuarium' before casting to enum
  IF v_role_string = 'wasplaats' THEN
    v_role_string := 'mortuarium';
  END IF;
  
  -- Now cast to app_role enum
  BEGIN
    v_role := v_role_string::app_role;
  EXCEPTION WHEN OTHERS THEN
    -- If casting fails or is NULL, default to 'family'
    v_role := 'family';
  END;
  
  -- If still NULL, default to 'family'
  IF v_role IS NULL THEN
    v_role := 'family';
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Fix 2: Update handle_new_org_registration to map wasplaats → mortuarium
CREATE OR REPLACE FUNCTION public.handle_new_org_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_metadata JSONB;
  v_requested_role app_role;
  v_role_string TEXT;
BEGIN
  -- Get user metadata to check requested role
  SELECT raw_user_meta_data INTO v_user_metadata
  FROM auth.users
  WHERE id = NEW.requested_by;
  
  -- Get role as string and map wasplaats → mortuarium
  v_role_string := v_user_metadata->>'role';
  IF v_role_string = 'wasplaats' THEN
    v_role_string := 'mortuarium';
  END IF;
  
  -- Cast to enum
  BEGIN
    v_requested_role := v_role_string::app_role;
  EXCEPTION WHEN OTHERS THEN
    v_requested_role := NULL;
  END;
  
  -- If user requested a professional role, assign roles accordingly
  IF v_requested_role IN ('funeral_director', 'mosque', 'mortuarium', 'insurer') THEN
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