
-- ====================================================
-- COMPLETE FIX: Registration Flow
-- ====================================================
-- Dit lost alle registratieproblemen op door:
-- 1. Correct trigger op auth.users
-- 2. Correcte fn_register_org_with_contact functie
-- 3. Proper error handling

-- STAP 1: Verwijder oude/conflicterende objecten
DROP TRIGGER IF EXISTS trg_auth_users_after_insert ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.fn_register_org_with_contact(uuid, text, text, text, text, text, text, text, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.fn_register_org_with_contact(uuid, text, text, text, text, text, text, text, boolean) CASCADE;

-- STAP 2: Maak de trigger functie voor nieuwe users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role app_role;
BEGIN
  -- Haal de rol op uit metadata
  v_user_role := (NEW.raw_user_meta_data->>'role')::app_role;
  
  -- Maak ALTIJD een profiel aan
  INSERT INTO public.profiles (id, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Voor family rol: direct toewijzen
  -- Voor professional rollen: SKIP (wordt via fn_register_org_with_contact gedaan)
  IF v_user_role = 'family' THEN
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (NEW.id, 'family', NULL)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- STAP 3: Maak de trigger
CREATE TRIGGER trg_auth_users_after_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- STAP 4: Maak de fn_register_org_with_contact functie
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
  v_verification_status text;
BEGIN
  -- Validatie
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  -- Bepaal rol op basis van org type
  v_role := CASE p_org_type
    WHEN 'FD' THEN 'funeral_director'
    WHEN 'INSURER' THEN 'insurer'
    WHEN 'WASPLAATS' THEN 'mortuarium'
    WHEN 'MOSQUE' THEN 'mosque'
    ELSE 'org_admin'
  END;
  
  -- Bepaal verification status
  v_verification_status := CASE WHEN p_set_active THEN 'ACTIVE' ELSE 'PENDING' END;
  
  -- Zoek of maak organisatie
  SELECT id INTO v_org_id
  FROM organizations
  WHERE type = p_org_type
    AND name = p_org_name
    AND business_number = p_business_number
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    -- Maak nieuwe organisatie
    INSERT INTO organizations (
      type,
      name,
      business_number,
      vat_number,
      verification_status,
      contact_email,
      contact_phone
    )
    VALUES (
      p_org_type,
      p_org_name,
      p_business_number,
      p_vat_number,
      v_verification_status,
      p_contact_email,
      p_contact_phone
    )
    RETURNING id INTO v_org_id;
  END IF;
  
  -- Update profiel (als het al bestaat)
  UPDATE profiles
  SET 
    first_name = p_contact_first_name,
    last_name = p_contact_last_name,
    phone = p_contact_phone
  WHERE id = p_user_id;
  
  -- Voeg user_role toe (met organization_id)
  INSERT INTO user_roles (user_id, role, organization_id, is_admin)
  VALUES (p_user_id, v_role, v_org_id, true)
  ON CONFLICT (user_id, role) DO UPDATE
  SET organization_id = v_org_id,
      is_admin = true;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'role', v_role,
    'verification_status', v_verification_status
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Registration failed: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.fn_register_org_with_contact TO authenticated, anon;
