-- Complete heropbouw registratie flow met atomische RPC functie
-- Vervangt oude multi-step aanpak met single atomic function

-- 1. Cleanup oude functies
DROP FUNCTION IF EXISTS public.create_user_profile(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.fn_register_org_with_contact_v2(text, text, text, text, text, text, text);

-- 2. Nieuwe atomische registratie functie
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
BEGIN
  -- Validatie: business_number verplicht voor INSURER en FUNERAL_DIRECTOR
  IF p_org_type IN ('INSURER', 'FUNERAL_DIRECTOR') AND (p_business_number IS NULL OR p_business_number = '') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Business number is required for this organization type'
    );
  END IF;

  -- Bepaal role op basis van org_type
  v_role := CASE p_org_type
    WHEN 'FUNERAL_DIRECTOR' THEN 'funeral_director'::app_role
    WHEN 'MOSQUE' THEN 'mosque'::app_role
    WHEN 'MORTUARIUM' THEN 'mortuarium'::app_role
    WHEN 'INSURER' THEN 'insurer'::app_role
    ELSE NULL
  END;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid organization type'
    );
  END IF;

  -- STAP 1: Maak profile aan (idempotent)
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (p_user_id, p_email, p_first_name, p_last_name, p_phone)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone;

  -- STAP 2: Maak organization aan
  INSERT INTO public.organizations (
    name,
    type,
    business_number,
    contact_email,
    contact_phone,
    verification_status
  ) VALUES (
    p_org_name,
    p_org_type,
    p_business_number,
    p_email,
    p_phone,
    'PENDING_VERIFICATION'
  )
  RETURNING id INTO v_org_id;

  -- STAP 3: Maak contact aan
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

  -- STAP 4: Koppel user aan organization met juiste role
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

  -- Audit log
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
      'org_type', p_org_type,
      'org_name', p_org_name,
      'role', v_role
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'organization_id', v_org_id,
    'contact_id', v_contact_id,
    'role', v_role
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;