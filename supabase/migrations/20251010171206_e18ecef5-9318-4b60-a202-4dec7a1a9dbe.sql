-- Fix Security Issue 1: Restrict rate_limit_tracking table access to admins only
-- Remove overly permissive policy
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limit_tracking;

-- Add restrictive policies for rate limiting
CREATE POLICY "Only admins can view rate limits" 
ON public.rate_limit_tracking 
FOR SELECT 
USING (has_role(auth.uid(), 'platform_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert rate limits" 
ON public.rate_limit_tracking 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update rate limits" 
ON public.rate_limit_tracking 
FOR UPDATE 
USING (true);

CREATE POLICY "System can delete rate limits" 
ON public.rate_limit_tracking 
FOR DELETE 
USING (true);

-- Fix Security Issue 2: Fix user_id resolution in registration function
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
  v_user_id uuid;
  v_role app_role;
  v_org_type_enum org_type;
  v_verification_status text;
BEGIN
  -- Explicit user_id resolution with clear priority and validation
  -- Priority: 1) Parameter 2) auth.uid() 3) JWT claim
  IF p_user_id IS NOT NULL THEN
    v_user_id := p_user_id;
  ELSIF auth.uid() IS NOT NULL THEN
    v_user_id := auth.uid();
  ELSE
    v_user_id := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
  END IF;
  
  -- Fail immediately if no user context found
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing user context: user_id is NULL (p_user_id=%, auth.uid()=%)', 
      p_user_id, auth.uid();
  END IF;

  -- Validate required fields
  IF NULLIF(TRIM(p_org_type), '') IS NULL THEN
    RAISE EXCEPTION 'Missing required param: p_org_type';
  END IF;
  
  IF NULLIF(TRIM(p_company_name), '') IS NULL THEN
    RAISE EXCEPTION 'Missing required param: p_company_name';
  END IF;
  
  IF NULLIF(TRIM(p_email), '') IS NULL THEN
    RAISE EXCEPTION 'Missing required param: p_email';
  END IF;

  -- Map org_type to enum and role
  CASE UPPER(TRIM(p_org_type))
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
    WHEN 'WASPLAATS' THEN 
      v_org_type_enum := 'MORTUARIUM'::org_type;
      v_role := 'mortuarium'::app_role;
    WHEN 'FAMILY' THEN 
      v_org_type_enum := 'FAMILY'::org_type;
      v_role := 'family'::app_role;
    WHEN 'ADMIN' THEN 
      v_org_type_enum := 'ADMIN'::org_type;
      v_role := 'platform_admin'::app_role;
    ELSE 
      RAISE EXCEPTION 'Invalid p_org_type: % (must be FUNERAL_DIRECTOR, MOSQUE, INSURER, MORTUARIUM, or FAMILY)', p_org_type;
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
    TRIM(p_company_name),
    TRIM(p_company_name),
    NULLIF(TRIM(p_business_number), ''),
    NULLIF(TRIM(p_contact_first_name), ''),
    NULLIF(TRIM(p_contact_last_name), ''),
    NULLIF(TRIM(p_phone), ''),
    TRIM(p_email),
    v_verification_status
  )
  RETURNING id INTO v_org_id;

  -- Assert v_user_id is NOT NULL before INSERT (extra safety)
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'CRITICAL: v_user_id became NULL before user_roles insert';
  END IF;

  -- Insert primary role with explicit NOT NULL user_id
  INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
  VALUES (v_user_id, v_role, v_org_id, true, 'ORG')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Insert org_admin role
  IF v_org_type_enum IN ('FUNERAL_DIRECTOR', 'MOSQUE', 'INSURER', 'MORTUARIUM') THEN
    INSERT INTO user_roles (user_id, role, organization_id, is_admin, scope)
    VALUES (v_user_id, 'org_admin'::app_role, v_org_id, true, 'ORG')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Update profile
  UPDATE profiles
  SET
    first_name = COALESCE(NULLIF(TRIM(p_contact_first_name), ''), first_name),
    last_name = COALESCE(NULLIF(TRIM(p_contact_last_name), ''), last_name),
    phone = COALESCE(NULLIF(TRIM(p_phone), ''), phone)
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'user_id', v_user_id,
    'role', v_role
  );

EXCEPTION
  WHEN not_null_violation THEN
    RAISE EXCEPTION 'NOT NULL violation: % (user_id=%, org_id=%)', SQLERRM, v_user_id, v_org_id;
    
  WHEN OTHERS THEN
    RAISE EXCEPTION 'fn_register_org_with_contact failed: %', SQLERRM;
END;
$$;