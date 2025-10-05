-- Fix 1: Update handle_new_user_role to use metadata role if present
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
BEGIN
  -- Check if user has a role specified in metadata
  v_role := (NEW.raw_user_meta_data->>'role')::app_role;
  
  -- If no role in metadata, default to 'family'
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

-- Fix 2: Allow new users to create organizations during registration
-- This policy allows users to create an organization if they are the requester
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

CREATE POLICY "Users can create organizations" 
ON public.organizations
FOR INSERT
WITH CHECK (
  auth.uid() = requested_by
);

-- Fix 3: Update handle_new_org_registration to assign the correct role
CREATE OR REPLACE FUNCTION public.handle_new_org_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- If user requested a professional role (funeral_director, mosque, wasplaats, insurer)
  -- assign org_admin role for the new organization
  IF v_requested_role IN ('funeral_director', 'mosque', 'wasplaats', 'insurer') THEN
    -- First, remove the default 'family' role if it exists
    DELETE FROM user_roles 
    WHERE user_id = NEW.requested_by 
      AND role = 'family';
    
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