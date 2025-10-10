-- Drop en hermaak fn_register_org_with_contact met correcte signature
-- Deze gebruikt p_org_name ipv p_company_name en werkt met het bestaande schema

DROP FUNCTION IF EXISTS public.fn_register_org_with_contact(text, text, text, text, text, text, text, uuid, boolean);

CREATE OR REPLACE FUNCTION public.fn_register_org_with_contact(
  p_org_type text,
  p_org_name text,
  p_business_number text DEFAULT NULL,
  p_contact_first_name text DEFAULT NULL,
  p_contact_last_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_set_active boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_role app_role;
  v_org_type_enum org_type;
  v_verification_status text;
BEGIN
  -- Explicit user_id resolution
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
  
  IF NULLIF(TRIM(p_org_name), '') IS NULL THEN
    RAISE EXCEPTION 'Missing required param: p_org_name';
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
      RAISE EXCEPTION 'Een organisatie met ondernemingsnummer % bestaat al', TRIM(p_business_number);
    END IF;
  END IF;

  -- Map org_type to enum and role
  CASE UPPER(TRIM(p_org_type))
    WHEN 'FUNERAL_DIRECTOR' THEN 
      v_org_type_enum := 'FUNERAL_DIRECTOR'::org_type;
      v_role := 'funeral_director'::app_role;
      -- Business number is required
      IF NULLIF(TRIM(p_business_number), '') IS NULL THEN
        RAISE EXCEPTION 'Ondernemingsnummer is verplicht voor Uitvaartonderneming';
      END IF;
    WHEN 'FD' THEN 
      v_org_type_enum := 'FUNERAL_DIRECTOR'::org_type;
      v_role := 'funeral_director'::app_role;
      IF NULLIF(TRIM(p_business_number), '') IS NULL THEN
        RAISE EXCEPTION 'Ondernemingsnummer is verplicht voor Uitvaartonderneming';
      END IF;
    WHEN 'MOSQUE' THEN 
      v_org_type_enum := 'MOSQUE'::org_type;
      v_role := 'mosque'::app_role;
      -- Business number is optional for mosque
    WHEN 'INSURER' THEN 
      v_org_type_enum := 'INSURER'::org_type;
      v_role := 'insurer'::app_role;
      IF NULLIF(TRIM(p_business_number), '') IS NULL THEN
        RAISE EXCEPTION 'Ondernemingsnummer is verplicht voor Verzekeraar';
      END IF;
    WHEN 'MORTUARIUM' THEN 
      v_org_type_enum := 'MORTUARIUM'::org_type;
      v_role := 'mortuarium'::app_role;
      IF NULLIF(TRIM(p_business_number), '') IS NULL THEN
        RAISE EXCEPTION 'Ondernemingsnummer is verplicht voor Mortuarium/Wasplaats';
      END IF;
    WHEN 'WASPLAATS' THEN 
      v_org_type_enum := 'MORTUARIUM'::org_type;
      v_role := 'mortuarium'::app_role;
      IF NULLIF(TRIM(p_business_number), '') IS NULL THEN
        RAISE EXCEPTION 'Ondernemingsnummer is verplicht voor Mortuarium/Wasplaats';
      END IF;
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

  -- Insert organization
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
      TRIM(p_org_name),
      TRIM(p_org_name),
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
      RAISE EXCEPTION 'Duplicaat organisatiegegevens (ondernemingsnummer of email bestaat al)';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Kon organisatie niet aanmaken: %', SQLERRM;
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