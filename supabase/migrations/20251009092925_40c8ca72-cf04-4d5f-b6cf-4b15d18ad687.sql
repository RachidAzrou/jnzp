-- 1.1 Voeg ontbrekende kolommen toe indien nodig (idempotent)
alter table organizations
  add column if not exists vat_number text,
  add column if not exists provisional boolean default true,
  add column if not exists company_name text,
  add column if not exists address_street text,
  add column if not exists address_city text,
  add column if not exists address_postcode text,
  add column if not exists address_country text,
  add column if not exists contact_first_name text,
  add column if not exists contact_last_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists language text;

-- 2. Vervang fn_register_org_with_contact (zonder contact_info)
drop function if exists fn_register_org_with_contact(text, text, text, text, text, text, text, boolean);

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
  v_ver_status org_ver_status := case when p_set_active then 'ACTIVE'::org_ver_status else 'PENDING'::org_ver_status end;
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

  -- 1) Zoek bestaande organisatie (CAST naar enum org_type)
  select id into v_org_id
  from organizations
  where type = upper(p_org_type)::org_type
    and lower(name) = lower(p_org_name)
  limit 1;

  if v_org_id is not null then
    v_org_exists := true;

    -- Activeer indien gevraagd; vul kvk/vat aan indien leeg
    update organizations
       set verification_status = case when p_set_active then 'ACTIVE'::org_ver_status else verification_status end,
           provisional         = case when p_set_active then false else provisional end,
           kvk_number          = coalesce(kvk_number, nullif(p_kvk,'')),
           vat_number          = coalesce(vat_number, nullif(p_vat,''))
     where id = v_org_id;

  else
    -- 2) Maak nieuwe organisatie aan (direct in de juiste kolommen)
    insert into organizations (
      name, type, verification_status, provisional,
      kvk_number, vat_number
    )
    values (
      trim(p_org_name),
      upper(p_org_type)::org_type,
      v_ver_status,
      v_provisional,
      nullif(p_kvk,''),
      nullif(p_vat,'')
    )
    returning id into v_org_id;
  end if;

  -- 3) Profiel lookup of create (idempotent op email)
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

  -- 4) Rol-koppeling (idempotent)
  insert into user_roles (user_id, organization_id, role, is_admin)
  values (v_user_id, v_org_id, v_role::app_role, true)
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
) to authenticated;