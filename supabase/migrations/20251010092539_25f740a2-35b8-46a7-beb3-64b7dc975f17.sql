-- Fix: Correcte parameter volgorde voor fn_register_org_with_contact
-- Alle verplichte parameters eerst, daarna optionele met defaults

DROP FUNCTION IF EXISTS public.fn_register_org_with_contact(uuid, text, text, text, text, text, text, text, text, boolean);

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

GRANT EXECUTE ON FUNCTION public.fn_register_org_with_contact(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated;