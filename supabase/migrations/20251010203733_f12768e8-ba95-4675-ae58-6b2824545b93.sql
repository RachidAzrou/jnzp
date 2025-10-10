-- Drop oude functie en hermaak met uuid return type

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
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id  uuid;
  v_user_id uuid;
BEGIN
  -- 0) Resolve user_id: payload -> auth.uid() -> JWT-claim
  v_user_id := coalesce(
    p_user_id,
    auth.uid(),
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  );
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing user context: user_id is NULL';
  END IF;

  -- 1) Vereisten
  IF nullif(trim(p_org_type),'') IS NULL THEN RAISE EXCEPTION 'Missing required param: p_org_type'; END IF;
  IF nullif(trim(p_org_name),'') IS NULL THEN RAISE EXCEPTION 'Missing required param: p_org_name'; END IF;
  IF nullif(trim(p_email),'')    IS NULL THEN RAISE EXCEPTION 'Missing required param: p_email'; END IF;

  IF p_org_type NOT IN ('FUNERAL_DIRECTOR','INSURER','MOSQUE','MORTUARIUM') THEN
    RAISE EXCEPTION 'Invalid org_type: %', p_org_type;
  END IF;

  -- 2) Rolregels ondernemingsnummer
  IF p_org_type IN ('FUNERAL_DIRECTOR','INSURER','MORTUARIUM') THEN
    IF nullif(trim(p_business_number),'') IS NULL THEN
      RAISE EXCEPTION 'Business number is required for role: %', p_org_type;
    END IF;
  END IF;

  -- 3) Check duplicate business_number
  IF p_business_number IS NOT NULL AND trim(p_business_number) != '' THEN
    IF EXISTS (
      SELECT 1 FROM organizations 
      WHERE business_number = trim(p_business_number)
    ) THEN
      RAISE EXCEPTION 'Een organisatie met ondernemingsnummer % bestaat al', trim(p_business_number);
    END IF;
  END IF;

  -- 4) Insert organisatie
  INSERT INTO organizations (type, name, business_number, verification_status)
  VALUES (
    p_org_type::org_type,
    trim(p_org_name),
    nullif(trim(p_business_number),''),
    CASE WHEN coalesce(p_set_active, false) THEN 'ACTIVE' ELSE 'PENDING_VERIFICATION' END
  )
  RETURNING id INTO v_org_id;

  -- 5) Koppel user ↔ org (gebruik organization_id zoals in schema)
  INSERT INTO user_roles (user_id, organization_id, role, is_admin, scope)
  VALUES (v_user_id, v_org_id, 
    CASE p_org_type
      WHEN 'FUNERAL_DIRECTOR' THEN 'funeral_director'::app_role
      WHEN 'MOSQUE' THEN 'mosque'::app_role
      WHEN 'INSURER' THEN 'insurer'::app_role
      WHEN 'MORTUARIUM' THEN 'mortuarium'::app_role
    END,
    true,
    'ORG'
  );

  -- 6) Ook org_admin voor professionals
  IF p_org_type IN ('FUNERAL_DIRECTOR', 'MOSQUE', 'INSURER', 'MORTUARIUM') THEN
    INSERT INTO user_roles (user_id, organization_id, role, is_admin, scope)
    VALUES (v_user_id, v_org_id, 'org_admin'::app_role, true, 'ORG')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- 7) Update profile
  UPDATE profiles
  SET
    first_name = COALESCE(NULLIF(TRIM(p_contact_first_name), ''), first_name),
    last_name = COALESCE(NULLIF(TRIM(p_contact_last_name), ''), last_name),
    phone = COALESCE(NULLIF(TRIM(p_phone), ''), phone)
  WHERE id = v_user_id;

  RETURN v_org_id;

EXCEPTION
  WHEN not_null_violation THEN
    RAISE EXCEPTION '%', SQLERRM;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'fn_register_org_with_contact failed: %', SQLERRM;
END;
$$;