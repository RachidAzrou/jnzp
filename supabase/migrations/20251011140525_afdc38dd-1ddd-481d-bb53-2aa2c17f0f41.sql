-- Complete rewrite: Atomische registratie functie met correcte type casting
-- Vervangt alle eerdere pogingen

DROP FUNCTION IF EXISTS public.register_professional_user(uuid, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.register_professional_user(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_org_type text,
  p_org_name text,
  p_business_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_contact_id uuid;
  v_role app_role;
  v_org_type_enum org_type;
BEGIN
  -- STAP 1: Map org_type string naar org_type enum
  v_org_type_enum := CASE UPPER(TRIM(p_org_type))
    WHEN 'FUNERAL_DIRECTOR' THEN 'FUNERAL_DIRECTOR'::org_type
    WHEN 'MOSQUE' THEN 'MOSQUE'::org_type
    WHEN 'MORTUARIUM' THEN 'MORTUARIUM'::org_type
    WHEN 'INSURER' THEN 'INSURER'::org_type
    ELSE NULL
  END;

  IF v_org_type_enum IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid organization type: ' || p_org_type
    );
  END IF;

  -- STAP 2: Validatie - business_number verplicht voor INSURER en FUNERAL_DIRECTOR
  IF v_org_type_enum IN ('INSURER', 'FUNERAL_DIRECTOR') 
     AND (p_business_number IS NULL OR TRIM(p_business_number) = '') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Business number is required for ' || v_org_type_enum
    );
  END IF;

  -- STAP 3: Map org_type enum naar app_role enum
  v_role := CASE v_org_type_enum
    WHEN 'FUNERAL_DIRECTOR' THEN 'funeral_director'::app_role
    WHEN 'MOSQUE' THEN 'mosque'::app_role
    WHEN 'MORTUARIUM' THEN 'mortuarium'::app_role
    WHEN 'INSURER' THEN 'insurer'::app_role
    ELSE NULL
  END;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot map organization type to role'
    );
  END IF;

  -- STAP 4: Maak profile aan (idempotent)
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (p_user_id, p_email, p_first_name, p_last_name, p_phone)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone;

  -- STAP 5: Maak organization aan (met correcte type casting)
  INSERT INTO public.organizations (
    name,
    type,
    business_number,
    contact_email,
    contact_phone,
    verification_status
  ) VALUES (
    p_org_name,
    v_org_type_enum,  -- ✅ Correct: gebruik enum type
    p_business_number,
    p_email,
    p_phone,
    'PENDING_VERIFICATION'
  )
  RETURNING id INTO v_org_id;

  -- STAP 6: Maak contact aan
  INSERT INTO public.contacts (
    organization_id,
    first_name,
    last_name,
    email,
    phone,
    is_primary
  ) VALUES (
    v_org_id,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    true
  )
  RETURNING id INTO v_contact_id;

  -- STAP 7: Koppel user aan organization met juiste role
  INSERT INTO public.user_roles (
    user_id,
    organization_id,
    role,
    is_admin
  ) VALUES (
    p_user_id,
    v_org_id,
    v_role,
    true  -- Eerste gebruiker is altijd org admin
  );

  -- STAP 8: Audit log
  INSERT INTO public.audit_events (
    user_id,
    event_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    p_user_id,
    'USER_REGISTERED',
    'Organization',
    v_org_id,
    'New professional user registered',
    jsonb_build_object(
      'org_type', v_org_type_enum::text,
      'org_name', p_org_name,
      'role', v_role::text
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'organization_id', v_org_id,
    'contact_id', v_contact_id,
    'role', v_role::text,
    'org_type', v_org_type_enum::text
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;