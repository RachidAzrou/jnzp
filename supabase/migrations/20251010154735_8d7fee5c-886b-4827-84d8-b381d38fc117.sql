-- STAP 1 & 2: Fix fn_register_org_with_contact
-- Fix verification_status bug (PENDING -> PENDING_VERIFICATION)
-- Voeg org_admin rol toe voor professional organizations

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
  -- Determine user_id
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user_id provided and no authenticated user';
  END IF;

  -- Map org_type text to enum
  v_org_type_enum := p_org_type::org_type;

  -- Map org_type to role
  CASE v_org_type_enum
    WHEN 'FUNERAL_DIRECTOR' THEN v_role := 'funeral_director'::app_role;
    WHEN 'MOSQUE' THEN v_role := 'mosque'::app_role;
    WHEN 'INSURER' THEN v_role := 'insurer'::app_role;
    WHEN 'MORTUARIUM' THEN v_role := 'mortuarium'::app_role;
    WHEN 'FAMILY' THEN v_role := 'family'::app_role;
    WHEN 'ADMIN' THEN v_role := 'platform_admin'::app_role;
    ELSE RAISE EXCEPTION 'Invalid organization type: %', p_org_type;
  END CASE;

  -- FIX: Use PENDING_VERIFICATION instead of PENDING
  v_verification_status := CASE WHEN p_set_active THEN 'ACTIVE' ELSE 'PENDING_VERIFICATION' END;

  -- Create organization
  INSERT INTO organizations (
    type,
    name,
    company_name,
    business_number,
    contact_first_name,
    contact_last_name,
    phone,
    email,
    verification_status,
    is_verified
  ) VALUES (
    v_org_type_enum,
    p_company_name,
    p_company_name,
    p_business_number,
    p_contact_first_name,
    p_contact_last_name,
    p_phone,
    p_email,
    v_verification_status,
    p_set_active
  )
  RETURNING id INTO v_org_id;

  -- Insert primary role
  INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
  VALUES (v_user_id, v_role, v_org_id, true, 'ORG')
  ON CONFLICT (user_id, role) DO UPDATE
  SET organization_id = v_org_id, is_admin = true, scope = 'ORG';

  -- NEW: Voor professional orgs, voeg ALTIJD ook org_admin toe
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

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'user_id', v_user_id,
    'role', v_role
  );
END;
$$;

-- STAP 3: Implementeer role-orgtype validatie trigger

CREATE OR REPLACE FUNCTION public.validate_role_for_org_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_type org_type;
BEGIN
  -- Skip validation als geen organization (platform_admin, family zonder org)
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get organization type
  SELECT type INTO v_org_type
  FROM organizations
  WHERE id = NEW.organization_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization % bestaat niet', NEW.organization_id;
  END IF;
  
  -- Valideer role tegen org_type
  IF NOT (
    (v_org_type = 'FUNERAL_DIRECTOR' AND NEW.role IN ('org_admin', 'funeral_director')) OR
    (v_org_type = 'MOSQUE' AND NEW.role IN ('org_admin', 'mosque')) OR
    (v_org_type = 'INSURER' AND NEW.role IN ('org_admin', 'insurer')) OR
    (v_org_type = 'MORTUARIUM' AND NEW.role IN ('org_admin', 'mortuarium')) OR
    (v_org_type = 'FAMILY' AND NEW.role = 'family') OR
    (v_org_type = 'ADMIN' AND NEW.role IN ('platform_admin', 'admin'))
  ) THEN
    RAISE EXCEPTION 'Role "%" is niet geldig voor organisatie type "%". Toegestane roles: %',
      NEW.role,
      v_org_type,
      CASE v_org_type
        WHEN 'FUNERAL_DIRECTOR' THEN 'org_admin, funeral_director'
        WHEN 'MOSQUE' THEN 'org_admin, mosque'
        WHEN 'INSURER' THEN 'org_admin, insurer'
        WHEN 'MORTUARIUM' THEN 'org_admin, mortuarium'
        WHEN 'FAMILY' THEN 'family'
        WHEN 'ADMIN' THEN 'platform_admin, admin'
        ELSE 'onbekend'
      END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Maak trigger aan
DROP TRIGGER IF EXISTS enforce_valid_role_for_org ON user_roles;
CREATE TRIGGER enforce_valid_role_for_org
BEFORE INSERT OR UPDATE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION validate_role_for_org_type();

-- STAP 4: Audit bestaande data
DO $$
DECLARE
  v_invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_invalid_count
  FROM user_roles ur
  JOIN organizations o ON o.id = ur.organization_id
  WHERE NOT (
    (o.type = 'FUNERAL_DIRECTOR' AND ur.role IN ('org_admin', 'funeral_director')) OR
    (o.type = 'MOSQUE' AND ur.role IN ('org_admin', 'mosque')) OR
    (o.type = 'INSURER' AND ur.role IN ('org_admin', 'insurer')) OR
    (o.type = 'MORTUARIUM' AND ur.role IN ('org_admin', 'mortuarium')) OR
    (o.type = 'FAMILY' AND ur.role = 'family') OR
    (o.type = 'ADMIN' AND ur.role IN ('platform_admin', 'admin'))
  );
  
  IF v_invalid_count > 0 THEN
    RAISE WARNING 'Gevonden: % bestaande ongeldige role-organization combinaties. Deze moeten handmatig worden opgeschoond.', v_invalid_count;
  ELSE
    RAISE NOTICE 'Alle bestaande role-organization combinaties zijn geldig.';
  END IF;
END $$;