-- Fix: Voeg SCOPE toe aan user_roles inserts
DROP TRIGGER IF EXISTS trg_auth_users_after_insert ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.fn_register_org_with_contact(uuid, text, text, text, text, text, text, text, text, boolean) CASCADE;

-- Recreate trigger MET scope voor family
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
BEGIN
  v_user_role := COALESCE(NEW.raw_user_meta_data->>'role', '');
  
  -- ALTIJD profiel aanmaken MET EMAIL
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Professionele rollen OVERSLAAN (worden door RPC gekoppeld)
  IF v_user_role NOT IN ('funeral_director', 'insurer', 'mosque', 'wasplaats', 'mortuarium') THEN
    -- Family/lege rol krijgt WEL direct een rol MET scope=PERSONAL
    IF v_user_role IN ('', 'family', 'relative') THEN
      INSERT INTO public.user_roles (user_id, role, organization_id, scope)
      VALUES (NEW.id, 'family'::app_role, NULL, 'PERSONAL')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_users_after_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Recreate fn_register_org_with_contact MET scope=ORG
CREATE OR REPLACE FUNCTION public.fn_register_org_with_contact(
  p_user_id uuid,
  p_org_type text,
  p_org_name text,
  p_contact_first_name text,
  p_contact_last_name text,
  p_contact_email text,
  p_business_number text,
  p_vat_number text,
  p_contact_phone text,
  p_set_active boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_role app_role;
  v_org_type_enum org_type;
  v_verification_status text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  -- Map frontend TEXT naar ENUM
  v_org_type_enum := CASE UPPER(TRIM(p_org_type))
    WHEN 'FD' THEN 'FUNERAL_DIRECTOR'::org_type
    WHEN 'FUNERAL_DIRECTOR' THEN 'FUNERAL_DIRECTOR'::org_type
    WHEN 'INSURER' THEN 'INSURER'::org_type
    WHEN 'WASPLAATS' THEN 'MORTUARIUM'::org_type
    WHEN 'MORTUARIUM' THEN 'MORTUARIUM'::org_type
    WHEN 'MOSQUE' THEN 'MOSQUE'::org_type
    ELSE 'OTHER'::org_type
  END;
  
  v_role := CASE v_org_type_enum
    WHEN 'FUNERAL_DIRECTOR' THEN 'funeral_director'::app_role
    WHEN 'INSURER' THEN 'insurer'::app_role
    WHEN 'MORTUARIUM' THEN 'mortuarium'::app_role
    WHEN 'MOSQUE' THEN 'mosque'::app_role
    ELSE 'org_admin'::app_role
  END;
  
  v_verification_status := CASE WHEN p_set_active THEN 'ACTIVE' ELSE 'PENDING' END;
  
  -- Zoek organisatie
  SELECT id INTO v_org_id
  FROM organizations
  WHERE type = v_org_type_enum
    AND LOWER(TRIM(name)) = LOWER(TRIM(p_org_name))
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (
      type, name, business_number, vat_number,
      verification_status, provisional,
      contact_email, contact_phone,
      contact_first_name, contact_last_name
    )
    VALUES (
      v_org_type_enum,
      TRIM(p_org_name),
      NULLIF(TRIM(p_business_number), ''),
      NULLIF(TRIM(p_vat_number), ''),
      v_verification_status,
      NOT p_set_active,
      NULLIF(TRIM(p_contact_email), ''),
      NULLIF(TRIM(p_contact_phone), ''),
      NULLIF(TRIM(p_contact_first_name), ''),
      NULLIF(TRIM(p_contact_last_name), '')
    )
    RETURNING id INTO v_org_id;
  ELSE
    UPDATE organizations
    SET 
      business_number = COALESCE(business_number, NULLIF(TRIM(p_business_number), '')),
      vat_number = COALESCE(vat_number, NULLIF(TRIM(p_vat_number), '')),
      contact_email = COALESCE(contact_email, NULLIF(TRIM(p_contact_email), '')),
      contact_phone = COALESCE(contact_phone, NULLIF(TRIM(p_contact_phone), ''))
    WHERE id = v_org_id;
  END IF;
  
  -- Update profiel
  UPDATE profiles
  SET 
    first_name = COALESCE(first_name, NULLIF(TRIM(p_contact_first_name), '')),
    last_name = COALESCE(last_name, NULLIF(TRIM(p_contact_last_name), '')),
    phone = COALESCE(phone, NULLIF(TRIM(p_contact_phone), ''))
  WHERE id = p_user_id;
  
  -- Koppel user MET scope=ORG
  INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
  VALUES (p_user_id, v_role, v_org_id, true, 'ORG')
  ON CONFLICT (user_id, role) DO UPDATE
  SET organization_id = v_org_id, is_admin = true, scope = 'ORG';
  
  RETURN jsonb_build_object(
    'success', true,
    'org_id', v_org_id,
    'user_id', p_user_id,
    'role', v_role,
    'org_type', v_org_type_enum
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Registration failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_register_org_with_contact(
  uuid, text, text, text, text, text, text, text, text, boolean
) TO authenticated, anon;