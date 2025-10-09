
-- Fix: gebruik PENDING_VERIFICATION in plaats van PENDING
create or replace function fn_register_org_with_contact(
  p_org_type text,
  p_org_name text,
  p_contact_full_name text,
  p_contact_email text,
  p_kvk text default null,
  p_vat text default null,
  p_contact_phone text default null,
  p_set_active boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_user_exists boolean := false;
  v_org_exists boolean := false;
  v_role text;
  -- FIX: gebruik PENDING_VERIFICATION in plaats van PENDING
  v_ver_status text := case when p_set_active then 'ACTIVE' else 'PENDING_VERIFICATION' end;
  v_provisional boolean := not p_set_active;
begin
  -- Validatie org-type (case-insensitive)
  if upper(p_org_type) not in ('FD','MORTUARIUM','MOSQUE','INSURER') then
    raise exception 'Unsupported org type: %', p_org_type;
  end if;

  -- Role mapping
  v_role := case upper(p_org_type)
              when 'FD'         then 'funeral_director'
              when 'MORTUARIUM' then 'mortuarium'
              when 'MOSQUE'     then 'mosque'
              when 'INSURER'    then 'insurer'
            end;

  -- 1) Zoek bestaande organisatie
  select id into v_org_id
  from organizations
  where type = upper(p_org_type)::org_type
    and lower(name) = lower(p_org_name)
  limit 1;

  if v_org_id is not null then
    v_org_exists := true;

    -- Update bestaande org: activeer indien gevraagd, vul business/vat aan
    update organizations
       set verification_status = case when p_set_active then 'ACTIVE' else verification_status end,
           provisional         = case when p_set_active then false else provisional end,
           business_number     = coalesce(business_number, nullif(p_kvk,'')),
           vat_number          = coalesce(vat_number, nullif(p_vat,''))
     where id = v_org_id;

  else
    -- 2) Nieuwe organisatie aanmaken
    insert into organizations (
      name, type, verification_status, provisional,
      business_number, vat_number
    )
    values (
      trim(p_org_name),
      upper(p_org_type)::org_type,
      v_ver_status,  -- nu PENDING_VERIFICATION of ACTIVE
      v_provisional,
      nullif(p_kvk,''),
      nullif(p_vat,'')
    )
    returning id into v_org_id;
  end if;

  -- 3) Profiel aanmaken/updaten
  select id into v_user_id
  from profiles
  where lower(email) = lower(p_contact_email)
  limit 1;

  if v_user_id is not null then
    v_user_exists := true;
    update profiles
       set full_name = coalesce(nullif(p_contact_full_name,''), full_name),
           phone     = coalesce(nullif(p_contact_phone,''), phone)
     where id = v_user_id;
  else
    insert into profiles (full_name, email, phone)
    values (trim(p_contact_full_name), trim(p_contact_email), nullif(p_contact_phone,''))
    returning id into v_user_id;
  end if;

  -- 4) Rol-koppeling (eerste gebruiker wordt admin)
  insert into user_roles (user_id, organization_id, role, is_admin)
  values (v_user_id, v_org_id, v_role, true)
  on conflict (user_id, organization_id, role) do nothing;

  return jsonb_build_object(
    'org_id', v_org_id,
    'user_id', v_user_id,
    'already_existed_org', v_org_exists,
    'already_existed_user', v_user_exists
  );
end
$$;

grant execute on function fn_register_org_with_contact(
  text, text, text, text, text, text, text, boolean
) to authenticated, anon;
