-- Fix profiles table en fn_register_org_with_contact functie

-- 1. Voeg full_name kolom toe aan profiles (indien nodig voor backwards compatibility)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Update de functie om correct met profiles te werken
CREATE OR REPLACE FUNCTION fn_register_org_with_contact(
  p_org_type TEXT,
  p_org_name TEXT,
  p_contact_full_name TEXT,
  p_contact_email TEXT,
  p_kvk TEXT DEFAULT NULL,
  p_vat TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_set_active BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_user_exists BOOLEAN := FALSE;
  v_org_exists BOOLEAN := FALSE;
  v_role app_role;
  v_ver_status TEXT := CASE WHEN p_set_active THEN 'ACTIVE' ELSE 'PENDING_VERIFICATION' END;
  v_provisional BOOLEAN := NOT p_set_active;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  -- Validatie org-type
  IF UPPER(p_org_type) NOT IN ('FD','MORTUARIUM','MOSQUE','INSURER') THEN
    RAISE EXCEPTION 'Unsupported org type: %', p_org_type;
  END IF;

  -- Role mapping
  v_role := CASE UPPER(p_org_type)
              WHEN 'FD'         THEN 'funeral_director'
              WHEN 'MORTUARIUM' THEN 'mortuarium'
              WHEN 'MOSQUE'     THEN 'mosque'
              WHEN 'INSURER'    THEN 'insurer'
            END;

  -- Split full_name in first_name en last_name
  v_first_name := SPLIT_PART(p_contact_full_name, ' ', 1);
  v_last_name := SUBSTRING(p_contact_full_name FROM LENGTH(v_first_name) + 2);

  -- 1) Zoek/maak organisatie
  SELECT id INTO v_org_id
  FROM organizations
  WHERE type = UPPER(p_org_type)::org_type
    AND LOWER(name) = LOWER(p_org_name)
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    v_org_exists := TRUE;
    
    UPDATE organizations
    SET verification_status = CASE WHEN p_set_active THEN 'ACTIVE' ELSE verification_status END,
        provisional = CASE WHEN p_set_active THEN FALSE ELSE provisional END,
        business_number = COALESCE(business_number, NULLIF(p_kvk,'')),
        vat_number = COALESCE(vat_number, NULLIF(p_vat,''))
    WHERE id = v_org_id;
  ELSE
    INSERT INTO organizations (
      name, type, verification_status, provisional,
      business_number, vat_number
    )
    VALUES (
      TRIM(p_org_name),
      UPPER(p_org_type)::org_type,
      v_ver_status,
      v_provisional,
      NULLIF(p_kvk,''),
      NULLIF(p_vat,'')
    )
    RETURNING id INTO v_org_id;
  END IF;

  -- 2) Zoek bestaande auth user op basis van email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_contact_email)
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    v_user_exists := TRUE;
    
    -- Update bestaand profiel
    UPDATE profiles
    SET first_name = COALESCE(NULLIF(v_first_name,''), first_name),
        last_name = COALESCE(NULLIF(v_last_name,''), last_name),
        full_name = COALESCE(NULLIF(p_contact_full_name,''), full_name),
        phone = COALESCE(NULLIF(p_contact_phone,''), phone)
    WHERE id = v_user_id;
    
    -- Zorg dat profiel bestaat als het niet bestaat
    INSERT INTO profiles (id, email, first_name, last_name, full_name, phone)
    VALUES (
      v_user_id,
      TRIM(p_contact_email),
      v_first_name,
      v_last_name,
      p_contact_full_name,
      NULLIF(p_contact_phone,'')
    )
    ON CONFLICT (id) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone;
  ELSE
    -- Geen auth user gevonden - dit zou niet mogen gebeuren als signUp eerst wordt aangeroepen
    RAISE EXCEPTION 'Auth user not found for email: %. Please create auth user first.', p_contact_email;
  END IF;

  -- 3) Koppel user aan organisatie via user_roles
  INSERT INTO user_roles (user_id, organization_id, role, is_admin)
  VALUES (v_user_id, v_org_id, v_role, TRUE)
  ON CONFLICT (user_id, organization_id, role) 
  DO UPDATE SET is_admin = TRUE;

  RETURN jsonb_build_object(
    'org_id', v_org_id,
    'user_id', v_user_id,
    'already_existed_org', v_org_exists,
    'already_existed_user', v_user_exists
  );
END
$$;

GRANT EXECUTE ON FUNCTION fn_register_org_with_contact(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated, anon;