-- Complete rebuild: Drop old function and create bulletproof v2
-- This version uses auth.uid() directly and returns jsonb for verification

drop function if exists public.fn_register_org_with_contact(text, text, text, text, text, text, text, uuid, boolean);

create or replace function public.fn_register_org_with_contact_v2(
  p_org_type text,
  p_org_name text,
  p_business_number text,
  p_contact_first_name text,
  p_contact_last_name text,
  p_email text,
  p_phone text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id  uuid;
  v_user_id uuid;
begin
  -- Get user_id DIRECTLY from auth context (always available in RPC)
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'FATAL: No auth context. User must be authenticated before calling this function.';
  end if;

  -- Validate org_type
  if p_org_type not in ('FUNERAL_DIRECTOR','INSURER','MOSQUE','MORTUARIUM') then
    raise exception 'Invalid org_type: %. Must be one of: FUNERAL_DIRECTOR, INSURER, MOSQUE, MORTUARIUM', p_org_type;
  end if;

  -- Validate required fields
  if nullif(trim(p_org_name),'') is null then
    raise exception 'Organization name is required';
  end if;
  
  if nullif(trim(p_email),'') is null then
    raise exception 'Email is required';
  end if;

  -- Business number validation for specific org types
  if p_org_type in ('FUNERAL_DIRECTOR','INSURER','MORTUARIUM')
     and nullif(trim(p_business_number),'') is null then
    raise exception 'Business number is required for org_type: %', p_org_type;
  end if;

  -- Insert organization (schema-exact columns only)
  insert into organizations (
    type, 
    name, 
    business_number,
    contact_first_name,
    contact_last_name,
    contact_email,
    contact_phone,
    verification_status
  ) values (
    p_org_type::org_type,
    trim(p_org_name),
    nullif(trim(p_business_number),''),
    trim(p_contact_first_name),
    trim(p_contact_last_name),
    trim(p_email),
    nullif(trim(p_phone),''),
    'PENDING_VERIFICATION'
  )
  returning id into v_org_id;

  -- Insert contact record
  insert into contacts (
    org_id,
    first_name,
    last_name,
    email,
    phone
  ) values (
    v_org_id,
    trim(p_contact_first_name),
    trim(p_contact_last_name),
    trim(p_email),
    nullif(trim(p_phone),'')
  );

  -- Link user to organization with org_admin role
  insert into user_roles (
    user_id,
    organization_id,
    role
  ) values (
    v_user_id,
    v_org_id,
    'org_admin'
  );

  -- Return success with IDs for verification
  return jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'user_id', v_user_id
  );

exception
  when not_null_violation then
    raise exception 'Database constraint violation: %', SQLERRM;
  when others then
    raise exception 'Registration failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
end;
$$;