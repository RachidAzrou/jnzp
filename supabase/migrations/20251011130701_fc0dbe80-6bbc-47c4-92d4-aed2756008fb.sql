-- Fix fn_register_org_with_contact: use organization_id and valid role
drop function if exists public.fn_register_org_with_contact(text, text, text, text, text, text, text, uuid, boolean);

create or replace function public.fn_register_org_with_contact(
  p_org_type text,
  p_org_name text,
  p_business_number text,
  p_contact_first_name text,
  p_contact_last_name text,
  p_email text,
  p_phone text,
  p_user_id uuid default null,
  p_set_active boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid := coalesce(
    p_user_id,
    auth.uid(),
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  );
begin
  if v_user_id is null then
    raise exception 'Missing user_id context';
  end if;

  -- Validate org_type
  if p_org_type not in ('FUNERAL_DIRECTOR', 'INSURER', 'MOSQUE', 'MORTUARIUM') then
    raise exception 'Invalid org_type: %', p_org_type;
  end if;

  -- Validate required fields
  if nullif(trim(p_org_name),'') is null then
    raise exception 'Organization name is required';
  end if;
  if nullif(trim(p_email),'') is null then
    raise exception 'Email is required';
  end if;

  -- Business number required for certain types
  if p_org_type in ('FUNERAL_DIRECTOR', 'INSURER', 'MORTUARIUM') then
    if nullif(trim(p_business_number),'') is null then
      raise exception 'Business number is required for %', p_org_type;
    end if;
  end if;

  -- Create organization
  insert into organizations (type, name, business_number, created_by, is_active)
  values (
    p_org_type::org_type,
    trim(p_org_name),
    nullif(trim(p_business_number),''),
    v_user_id,
    coalesce(p_set_active, false)
  )
  returning id into v_org_id;

  -- Create contact
  insert into contacts (org_id, first_name, last_name, email, phone, created_by)
  values (
    v_org_id,
    trim(p_contact_first_name),
    trim(p_contact_last_name),
    trim(p_email),
    nullif(trim(p_phone),''),
    v_user_id
  );

  -- Create user role with correct column name and valid role
  insert into user_roles (user_id, organization_id, role)
  values (v_user_id, v_org_id, 'org_admin');

  return v_org_id;
end;
$$;