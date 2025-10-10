-- Remove is_verified column from fn_register_org_with_contact INSERT
-- The organizations table does not have an is_verified column

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
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user_id provided and no authenticated user';
  END IF;

  v_org_type_enum := p_org_type::org_type;

  CASE v_org_type_enum
    WHEN 'FUNERAL_DIRECTOR' THEN v_role := 'funeral_director'::app_role;
    WHEN 'MOSQUE' THEN v_role := 'mosque'::app_role;
    WHEN 'INSURER' THEN v_role := 'insurer'::app_role;
    WHEN 'MORTUARIUM' THEN v_role := 'mortuarium'::app_role;
    WHEN 'FAMILY' THEN v_role := 'family'::app_role;
    WHEN 'ADMIN' THEN v_role := 'platform_admin'::app_role;
    ELSE RAISE EXCEPTION 'Invalid organization type: %', p_org_type;
  END CASE;

  v_verification_status := CASE WHEN p_set_active THEN 'ACTIVE' ELSE 'PENDING_VERIFICATION' END;

  -- FIX: Removed is_verified column (doesn't exist in organizations table)
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

  -- Insert primary role
  INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
  VALUES (v_user_id, v_role, v_org_id, true, 'ORG')
  ON CONFLICT (user_id, role) DO UPDATE
  SET organization_id = v_org_id, is_admin = true, scope = 'ORG';

  -- Add org_admin role for professional organizations
  IF v_org_type_enum IN ('FUNERAL_DIRECTOR', 'MOSQUE', 'INSURER', 'MORTUARIUM') THEN
    INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
    VALUES (v_user_id, 'org_admin'::app_role, v_org_id, true, 'ORG')
    ON CONFLICT (user_id, role) DO UPDATE
    SET organization_id = v_org_id, is_admin = true, scope = 'ORG';
  END IF;

  -- Update profile
  UPDATE profiles
  SET
    first_name = COALESCE(p_contact_first_name, first_name),
    last_name = COALESCE(p_contact_last_name, last_name),
    phone = COALESCE(p_phone, phone),
    organization_id = v_org_id
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'user_id', v_user_id,
    'role', v_role
  );
END;
$$;