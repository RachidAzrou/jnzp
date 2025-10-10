
-- Fix fn_register_org_with_contact to handle duplicate business_number gracefully
-- The function was failing silently when business_number already exists

CREATE OR REPLACE FUNCTION public.fn_register_org_with_contact(
  p_org_type text,
  p_company_name text,
  p_business_number text DEFAULT NULL,
  p_contact_first_name text DEFAULT NULL,
  p_contact_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_set_active boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_role app_role;
  v_org_type_enum org_type;
  v_verification_status text;
BEGIN
  -- Explicit user_id resolution with clear priority and validation
  IF p_user_id IS NOT NULL THEN
    v_user_id := p_user_id;
  ELSIF auth.uid() IS NOT NULL THEN
    v_user_id := auth.uid();
  ELSE
    v_user_id := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
  END IF;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing user context: user_id is NULL';
  END IF;

  -- Validate required fields
  IF NULLIF(TRIM(p_org_type), '') IS NULL THEN
    RAISE EXCEPTION 'Missing required param: p_org_type';
  END IF;
  
  IF NULLIF(TRIM(p_company_name), '') IS NULL THEN
    RAISE EXCEPTION 'Missing required param: p_company_name';
  END IF;
  
  IF NULLIF(TRIM(p_email), '') IS NULL THEN
    RAISE EXCEPTION 'Missing required param: p_email';
  END IF;

  -- Check for duplicate business_number BEFORE attempting INSERT
  IF p_business_number IS NOT NULL AND TRIM(p_business_number) != '' THEN
    IF EXISTS (
      SELECT 1 FROM organizations 
      WHERE business_number = TRIM(p_business_number)
    ) THEN
      RAISE EXCEPTION 'An organization with business number % already exists', TRIM(p_business_number);
    END IF;
  END IF;

  -- Map org_type to enum and role
  CASE UPPER(TRIM(p_org_type))
    WHEN 'FUNERAL_DIRECTOR' THEN 
      v_org_type_enum := 'FUNERAL_DIRECTOR'::org_type;
      v_role := 'funeral_director'::app_role;
    WHEN 'FD' THEN 
      v_org_type_enum := 'FUNERAL_DIRECTOR'::org_type;
      v_role := 'funeral_director'::app_role;
    WHEN 'MOSQUE' THEN 
      v_org_type_enum := 'MOSQUE'::org_type;
      v_role := 'mosque'::app_role;
    WHEN 'INSURER' THEN 
      v_org_type_enum := 'INSURER'::org_type;
      v_role := 'insurer'::app_role;
    WHEN 'MORTUARIUM' THEN 
      v_org_type_enum := 'MORTUARIUM'::org_type;
      v_role := 'mortuarium'::app_role;
    WHEN 'WASPLAATS' THEN 
      v_org_type_enum := 'MORTUARIUM'::org_type;
      v_role := 'mortuarium'::app_role;
    WHEN 'FAMILY' THEN 
      v_org_type_enum := 'FAMILY'::org_type;
      v_role := 'family'::app_role;
    WHEN 'ADMIN' THEN 
      v_org_type_enum := 'ADMIN'::org_type;
      v_role := 'platform_admin'::app_role;
    ELSE 
      RAISE EXCEPTION 'Invalid p_org_type: %', p_org_type;
  END CASE;

  v_verification_status := CASE WHEN p_set_active THEN 'ACTIVE' ELSE 'PENDING_VERIFICATION' END;

  -- Insert organization with explicit error handling
  BEGIN
    INSERT INTO organizations (
      type,
      name,
      company_name,
      business_number,
      contact_first_name,
      contact_last_name,
      contact_phone,
      contact_email,
      verification_status
    ) VALUES (
      v_org_type_enum,
      TRIM(p_company_name),
      TRIM(p_company_name),
      NULLIF(TRIM(p_business_number), ''),
      NULLIF(TRIM(p_contact_first_name), ''),
      NULLIF(TRIM(p_contact_last_name), ''),
      NULLIF(TRIM(p_phone), ''),
      TRIM(p_email),
      v_verification_status
    )
    RETURNING id INTO v_org_id;
    
    -- Verify INSERT succeeded
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Organization INSERT failed - no ID returned';
    END IF;
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Duplicate organization data detected (business_number or email already exists)';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create organization: %', SQLERRM;
  END;

  -- Insert primary role
  INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
  VALUES (v_user_id, v_role, v_org_id, true, 'ORG')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Insert org_admin role for professional orgs
  IF v_org_type_enum IN ('FUNERAL_DIRECTOR', 'MOSQUE', 'INSURER', 'MORTUARIUM') THEN
    INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
    VALUES (v_user_id, 'org_admin'::app_role, v_org_id, true, 'ORG')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Update profile
  UPDATE profiles
  SET
    first_name = COALESCE(NULLIF(TRIM(p_contact_first_name), ''), first_name),
    last_name = COALESCE(NULLIF(TRIM(p_contact_last_name), ''), last_name),
    phone = COALESCE(NULLIF(TRIM(p_phone), ''), phone)
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'user_id', v_user_id,
    'role', v_role
  );

END;
$$;
