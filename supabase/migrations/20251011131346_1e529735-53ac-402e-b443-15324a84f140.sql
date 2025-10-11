-- Fix fn_register_org_with_contact: remove created_by columns that don't exist
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
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id  uuid;
  v_user_id uuid := coalesce(
    p_user_id,
    auth.uid(),
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  );
begin
  if v_user_id is null then
    raise exception 'Missing user context: user_id is NULL';
  end if;

  if nullif(trim(p_org_type),'') is null then
    raise exception 'Missing required param: p_org_type';
  end if;
  if nullif(trim(p_org_name),'') is null then
    raise exception 'Missing required param: p_org_name';
  end if;
  if nullif(trim(p_email),'') is null then
    raise exception 'Missing required param: p_email';
  end if;

  if p_org_type not in ('FUNERAL_DIRECTOR','INSURER','MOSQUE','MORTUARIUM') then
    raise exception 'Invalid org_type: %', p_org_type;
  end if;

  if p_org_type in ('FUNERAL_DIRECTOR','INSURER','MORTUARIUM')
     and nullif(trim(p_business_number),'') is null then
    raise exception 'Business number is required for role: %', p_org_type;
  end if;

  -- Create organization without created_by
  insert into organizations (type, name, business_number, is_active)
  values (
    p_org_type::org_type,
    trim(p_org_name),
    nullif(trim(p_business_number),''),
    coalesce(p_set_active, false)
  )
  returning id into v_org_id;

  -- Create contact without created_by
  insert into contacts (org_id, first_name, last_name, email, phone)
  values (
    v_org_id,
    trim(p_contact_first_name),
    trim(p_contact_last_name),
    trim(p_email),
    nullif(trim(p_phone),'')
  );

  -- Create user role with correct column name and valid role
  insert into user_roles (user_id, organization_id, role)
  values (v_user_id, v_org_id, 'org_admin');

  return v_org_id;

exception
  when not_null_violation then
    raise exception 'NOT NULL violation: %', SQLERRM;
  when others then
    raise exception 'fn_register_org_with_contact failed: %', SQLERRM;
end;
$$;