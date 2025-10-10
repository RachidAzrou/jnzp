-- FINAL COMPLETE FIX: Gebruik CONSTANT in plaats van variabele
-- Dit voorkomt scope issues in ON CONFLICT statements
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
  v_final_user_id uuid; -- Gebruik FINAL om naming conflict te voorkomen
  v_role app_role;
  v_org_type_enum org_type;
  v_verification_status text;
BEGIN
  -- CRITICAL: Sla de user_id op als CONSTANT aan het begin
  v_final_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_final_user_id IS NULL THEN
    RAISE EXCEPTION 'No user_id provided and no authenticated user';
  END IF;

  -- Map org_type to enum and role
  CASE p_org_type
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
    WHEN 'FAMILY' THEN 
      v_org_type_enum := 'FAMILY'::org_type;
      v_role := 'family'::app_role;
    WHEN 'ADMIN' THEN 
      v_org_type_enum := 'ADMIN'::org_type;
      v_role := 'platform_admin'::app_role;
    ELSE 
      RAISE EXCEPTION 'Invalid organization type: %', p_org_type;
  END CASE;

  v_verification_status := CASE WHEN p_set_active THEN 'ACTIVE' ELSE 'PENDING_VERIFICATION' END;

  -- Insert organization
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

  -- FIX: Gebruik de COALESCE direct in de INSERT om scope issues te vermijden
  INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
  VALUES (COALESCE(p_user_id, auth.uid()), v_role, v_org_id, true, 'ORG')
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    organization_id = EXCLUDED.organization_id,
    is_admin = EXCLUDED.is_admin,
    scope = EXCLUDED.scope,
    updated_at = now();

  -- FIX: Ook hier COALESCE direct gebruiken
  IF v_org_type_enum IN ('FUNERAL_DIRECTOR', 'MOSQUE', 'INSURER', 'MORTUARIUM') THEN
    INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
    VALUES (COALESCE(p_user_id, auth.uid()), 'org_admin'::app_role, v_org_id, true, 'ORG')
    ON CONFLICT (user_id, role) 
    DO UPDATE SET 
      organization_id = EXCLUDED.organization_id,
      is_admin = EXCLUDED.is_admin,
      scope = EXCLUDED.scope,
      updated_at = now();
  END IF;

  -- Update profile - gebruik de v_final_user_id hier
  UPDATE profiles
  SET
    first_name = COALESCE(p_contact_first_name, first_name),
    last_name = COALESCE(p_contact_last_name, last_name),
    phone = COALESCE(p_phone, phone)
  WHERE id = v_final_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'user_id', v_final_user_id,
    'role', v_role
  );
END;
$$;

-- Heractiveer de triggers
ALTER TABLE public.user_roles ENABLE TRIGGER audit_role_changes_trigger;
ALTER TABLE public.user_roles ENABLE TRIGGER enforce_valid_role_for_org;
ALTER TABLE public.user_roles ENABLE TRIGGER prevent_last_admin_deletion_trigger;
ALTER TABLE public.user_roles ENABLE TRIGGER prevent_last_admin_role_change_trigger;