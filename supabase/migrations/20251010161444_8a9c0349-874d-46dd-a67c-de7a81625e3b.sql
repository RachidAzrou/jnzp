-- COMPLETE FIX: Drop alle versies en recreate één unified functie
-- Dit lost op: functie conflicts, parameter mismatches, ON CONFLICT issues, profiles update errors

-- Drop ALLE bestaande versies van fn_register_org_with_contact
DROP FUNCTION IF EXISTS public.fn_register_org_with_contact(text, text, text, text, text, text, text, uuid, boolean);
DROP FUNCTION IF EXISTS public.fn_register_org_with_contact(uuid, text, text, text, text, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.fn_register_org_with_contact(uuid, text, text, text, text, text, text, text, boolean);

-- Recreate ÉÉN unified versie met p_org_type als eerste parameter
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
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user_id provided and no authenticated user';
  END IF;

  -- Convert string naar org_type enum, met FD als alias voor FUNERAL_DIRECTOR
  CASE UPPER(p_org_type)
    WHEN 'FUNERAL_DIRECTOR' THEN v_org_type_enum := 'FUNERAL_DIRECTOR'::org_type;
    WHEN 'FD' THEN v_org_type_enum := 'FUNERAL_DIRECTOR'::org_type;
    WHEN 'MOSQUE' THEN v_org_type_enum := 'MOSQUE'::org_type;
    WHEN 'INSURER' THEN v_org_type_enum := 'INSURER'::org_type;
    WHEN 'MORTUARIUM' THEN v_org_type_enum := 'MORTUARIUM'::org_type;
    WHEN 'FAMILY' THEN v_org_type_enum := 'FAMILY'::org_type;
    WHEN 'ADMIN' THEN v_org_type_enum := 'ADMIN'::org_type;
    ELSE RAISE EXCEPTION 'Invalid organization type: %', p_org_type;
  END CASE;

  -- Map org_type naar app_role
  CASE v_org_type_enum
    WHEN 'FUNERAL_DIRECTOR' THEN v_role := 'funeral_director'::app_role;
    WHEN 'MOSQUE' THEN v_role := 'mosque'::app_role;
    WHEN 'INSURER' THEN v_role := 'insurer'::app_role;
    WHEN 'MORTUARIUM' THEN v_role := 'mortuarium'::app_role;
    WHEN 'FAMILY' THEN v_role := 'family'::app_role;
    WHEN 'ADMIN' THEN v_role := 'platform_admin'::app_role;
    ELSE RAISE EXCEPTION 'Invalid organization type for role mapping: %', v_org_type_enum;
  END CASE;

  v_verification_status := CASE WHEN p_set_active THEN 'ACTIVE' ELSE 'PENDING_VERIFICATION' END;

  -- Insert organization (zonder is_verified kolom)
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
    p_company_name,
    p_company_name,
    p_business_number,
    p_contact_first_name,
    p_contact_last_name,
    p_phone,
    p_email,
    v_verification_status
  )
  RETURNING id INTO v_org_id;

  -- DELETE oude roles om ON CONFLICT te voorkomen
  DELETE FROM user_roles WHERE user_id = v_user_id;

  -- Insert primary role
  INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
  VALUES (v_user_id, v_role, v_org_id, true, 'ORG');

  -- Add org_admin role voor professionals
  IF v_org_type_enum IN ('FUNERAL_DIRECTOR', 'MOSQUE', 'INSURER', 'MORTUARIUM') THEN
    INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
    VALUES (v_user_id, 'org_admin'::app_role, v_org_id, true, 'ORG');
  END IF;

  -- Update profile (ZONDER organization_id update want kolom bestaat niet)
  UPDATE profiles
  SET
    first_name = COALESCE(p_contact_first_name, first_name),
    last_name = COALESCE(p_contact_last_name, last_name),
    phone = COALESCE(p_phone, phone)
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'user_id', v_user_id,
    'role', v_role
  );
END;
$$;