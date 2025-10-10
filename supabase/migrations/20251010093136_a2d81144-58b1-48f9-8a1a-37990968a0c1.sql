-- CRITICAL FIX: Cleanup en herstel registratieflow
-- Verwijder ALLE oude versies en maak clean nieuwe versie

-- 1. Drop ALLE versies van fn_register_org_with_contact
DROP FUNCTION IF EXISTS public.fn_register_org_with_contact(text, text, text, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.fn_register_org_with_contact(uuid, text, text, text, text, text, text, text, text, boolean);

-- 2. Drop en hermaak handle_new_user_role
DROP TRIGGER IF EXISTS trg_auth_users_after_insert ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role() CASCADE;

-- 3. Maak NIEUWE handle_new_user_role functie
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', '');
BEGIN
  -- Altijd een profiel aanmaken
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    TRIM(COALESCE(((NEW.raw_user_meta_data->>'first_name') || ' ' || (NEW.raw_user_meta_data->>'last_name')), '')),
    NULLIF(NEW.raw_user_meta_data->>'phone','')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Professionele users NOOIT hier een rol geven (organization_id ontbreekt nog)
  IF v_role IN ('funeral_director','insurer','mosque','wasplaats','mortuarium','MORTUARIUM','MOSQUE','WASPLAATS','INSURER','FUNERAL_DIRECTOR') THEN
    RETURN NEW;
  END IF;

  -- Family (of lege rol) mag een BASIC rol krijgen zonder organisatie
  IF v_role IN ('', 'family', 'relative') THEN
    INSERT INTO public.user_roles (user_id, role, organization_id, is_admin)
    VALUES (NEW.id, 'family', NULL, FALSE)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END
$$;

-- 4. Maak NIEUWE trigger
CREATE TRIGGER trg_auth_users_after_insert
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 5. Maak NIEUWE fn_register_org_with_contact (ENIGE VERSIE)
CREATE OR REPLACE FUNCTION public.fn_register_org_with_contact(
  p_user_id UUID,
  p_org_type TEXT,
  p_org_name TEXT,
  p_contact_first_name TEXT,
  p_contact_last_name TEXT,
  p_contact_email TEXT,
  p_business_number TEXT DEFAULT NULL,
  p_vat_number TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_set_active BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_already_exists BOOLEAN := FALSE;
  v_type org_type;
  v_role app_role;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing p_user_id';
  END IF;

  -- Valid org_type
  v_type := UPPER(p_org_type)::org_type;

  -- Bepaal de rol
  v_role := CASE v_type 
    WHEN 'INSURER' THEN 'insurer'::app_role
    WHEN 'MOSQUE' THEN 'mosque'::app_role
    WHEN 'MORTUARIUM' THEN 'mortuarium'::app_role
    WHEN 'FUNERAL_DIRECTOR' THEN 'funeral_director'::app_role
    ELSE 'family'::app_role
  END;

  -- Zoek bestaande org
  SELECT id INTO v_org_id
  FROM organizations
  WHERE type = v_type
    AND LOWER(name) = LOWER(TRIM(p_org_name))
  LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO organizations (
      name, type, verification_status, provisional,
      business_number, vat_number,
      contact_email, contact_phone,
      contact_first_name, contact_last_name
    )
    VALUES (
      TRIM(p_org_name), v_type,
      CASE WHEN p_set_active THEN 'ACTIVE' ELSE 'PENDING_VERIFICATION' END,
      CASE WHEN p_set_active THEN FALSE ELSE TRUE END,
      NULLIF(p_business_number,''), NULLIF(p_vat_number,''),
      NULLIF(p_contact_email,''), NULLIF(p_contact_phone,''),
      NULLIF(p_contact_first_name,''), NULLIF(p_contact_last_name,'')
    )
    RETURNING id INTO v_org_id;
  ELSE
    v_already_exists := TRUE;

    -- Vul ontbrekende gegevens bij
    UPDATE organizations
       SET business_number = COALESCE(business_number, NULLIF(p_business_number,'')),
           vat_number       = COALESCE(vat_number, NULLIF(p_vat_number,'')),
           contact_email    = COALESCE(contact_email, NULLIF(p_contact_email,'')),
           contact_phone    = COALESCE(contact_phone, NULLIF(p_contact_phone,'')),
           contact_first_name = COALESCE(contact_first_name, NULLIF(p_contact_first_name,'')),
           contact_last_name  = COALESCE(contact_last_name, NULLIF(p_contact_last_name,''))
     WHERE id = v_org_id;
  END IF;

  -- Zorg dat profiel bestaat (idempotent)
  INSERT INTO profiles (id, email, full_name, phone)
  VALUES (
    p_user_id,
    p_contact_email,
    CONCAT_WS(' ', NULLIF(p_contact_first_name,''), NULLIF(p_contact_last_name,'')),
    NULLIF(p_contact_phone,'')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
      phone = COALESCE(profiles.phone, EXCLUDED.phone);

  -- Koppel user ↔ org (met rol én org_admin)
  INSERT INTO user_roles (user_id, organization_id, role, is_admin)
  VALUES (p_user_id, v_org_id, v_role, TRUE)
  ON CONFLICT (user_id, role) DO UPDATE
  SET organization_id = v_org_id,
      is_admin = TRUE;

  RETURN JSONB_BUILD_OBJECT(
    'org_id', v_org_id,
    'user_id', p_user_id,
    'already_existed', v_already_exists
  );
END
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.fn_register_org_with_contact(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated;