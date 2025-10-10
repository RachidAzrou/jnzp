-- Fix user_id resolution met expliciete fallbacks
DROP FUNCTION IF EXISTS public.fn_register_org_with_contact(text, text, text, text, text, text, text, uuid, boolean);

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
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_role app_role;
  v_org_type_enum org_type;
  v_verification_status text;
BEGIN
  -- 0) Resolve user_id: payload -> auth.uid() -> JWT claim fallback
  v_user_id := COALESCE(
    p_user_id,
    auth.uid(),
    NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  );
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing user context: user_id is NULL (no p_user_id and no auth.uid())';
  END IF;

  -- 1) Expliciete validatie van verplichte velden
  IF NULLIF(TRIM(p_org_type), '') IS NULL THEN
    RAISE EXCEPTION 'Missing required param: p_org_type';
  END IF;
  
  IF NULLIF(TRIM(p_company_name), '') IS NULL THEN
    RAISE EXCEPTION 'Missing required param: p_company_name';
  END IF;
  
  IF NULLIF(TRIM(p_email), '') IS NULL THEN
    RAISE EXCEPTION 'Missing required param: p_email';
  END IF;

  -- 2) Map org_type to enum and role met validatie
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
      RAISE EXCEPTION 'Invalid p_org_type: % (must be FUNERAL_DIRECTOR, MOSQUE, INSURER, MORTUARIUM, or FAMILY)', p_org_type;
  END CASE;

  v_verification_status := CASE WHEN p_set_active THEN 'ACTIVE' ELSE 'PENDING_VERIFICATION' END;

  -- 3) Insert organization (gebruik v_user_id)
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

  -- 4) Insert primary role (gebruik v_user_id expliciet)
  INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
  VALUES (v_user_id, v_role, v_org_id, true, 'ORG')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 5) Insert org_admin role (gebruik v_user_id expliciet)
  IF v_org_type_enum IN ('FUNERAL_DIRECTOR', 'MOSQUE', 'INSURER', 'MORTUARIUM') THEN
    INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
    VALUES (v_user_id, 'org_admin'::app_role, v_org_id, true, 'ORG')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- 6) Update profile (gebruik v_user_id expliciet)
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

EXCEPTION
  WHEN not_null_violation THEN
    -- geef de originele Postgres boodschap door, die bevat de kolomnaam:
    RAISE EXCEPTION '%', SQLERRM;
    
  WHEN OTHERS THEN
    RAISE EXCEPTION 'fn_register_org_with_contact failed: %', SQLERRM;
END;
$$;