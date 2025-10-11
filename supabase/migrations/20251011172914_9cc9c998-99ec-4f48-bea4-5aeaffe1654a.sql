-- 1. MFA-grace tracking
alter table user_2fa_settings
  add column if not exists mfa_grace_expires_at timestamptz;

-- 2. Trigger voor automatische 24u grace bij signup
create or replace function init_mfa_grace_on_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into user_2fa_settings (user_id, totp_enabled, mfa_grace_expires_at)
  values (new.id, false, now() + interval '24 hours')
  on conflict (user_id) do update
    set mfa_grace_expires_at = coalesce(user_2fa_settings.mfa_grace_expires_at, excluded.mfa_grace_expires_at);
  return new;
end $$;

drop trigger if exists trg_init_mfa_grace on auth.users;
create trigger trg_init_mfa_grace
after insert on auth.users
for each row execute function init_mfa_grace_on_signup();

-- 3. View voor MFA status
create or replace view v_user_mfa_status as
select
  p.id as user_id,
  coalesce(u2.totp_enabled, false) as totp_enabled,
  u2.mfa_grace_expires_at
from profiles p
left join user_2fa_settings u2 on u2.user_id = p.id;

-- 4. Helper functie voor MFA access check
create or replace function can_access_with_mfa()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from v_user_mfa_status s
    where s.user_id = auth.uid()
      and (s.totp_enabled = true
        or (s.mfa_grace_expires_at is not null and now() < s.mfa_grace_expires_at))
  )
  or exists (select 1 from user_roles where user_id = auth.uid() and role = 'platform_admin');
$$;

-- 5. RLS Policies voor Claims (verzekeraars)
drop policy if exists "Insurers can view their claims" on claims;
drop policy if exists "Insurers can update their claims" on claims;

create policy "Insurers can view their claims" on claims
  for select using (
    can_access_with_mfa() and
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'insurer'
        and ur.organization_id = claims.insurer_org_id
    )
  );

create policy "Insurers can update their claims" on claims
  for update using (
    can_access_with_mfa() and
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'insurer'
        and ur.organization_id = claims.insurer_org_id
    )
  );

-- 6. RLS Policy voor Dossiers (read-only voor verzekeraars)
drop policy if exists "Insurers can view their organization's dossiers" on dossiers;

create policy "Insurers can view their organization's dossiers" on dossiers
  for select using (
    can_access_with_mfa() and
    has_role(auth.uid(), 'insurer') and
    (insurer_org_id in (
      select organization_id from user_roles
      where user_id = auth.uid() and role = 'insurer'
    ))
  );

-- 7. RLS Policy voor Documenten (verzekeraars kunnen documenten van hun dossiers zien)
drop policy if exists "Insurers can view documents for their dossiers" on documents;

create policy "Insurers can view documents for their dossiers" on documents
  for select using (
    can_access_with_mfa() and
    has_role(auth.uid(), 'insurer') and
    (dossier_id in (
      select id from dossiers
      where insurer_org_id in (
        select organization_id from user_roles
        where user_id = auth.uid() and role = 'insurer'
      )
    ))
  );

-- 8. RLS Policy voor Invoices (verzekeraars kunnen facturen zien die aan hun dossiers gekoppeld zijn)
drop policy if exists "Insurers can view invoices" on invoices;
drop policy if exists "Insurers can update invoices" on invoices;

create policy "Insurers can view invoices" on invoices
  for select using (
    can_access_with_mfa() and
    has_role(auth.uid(), 'insurer') and
    (dossier_id in (
      select id from dossiers
      where insurer_org_id in (
        select organization_id from user_roles
        where user_id = auth.uid() and role = 'insurer'
      )
    ))
  );

create policy "Insurers can update invoices" on invoices
  for update using (
    can_access_with_mfa() and
    has_role(auth.uid(), 'insurer') and
    (dossier_id in (
      select id from dossiers
      where insurer_org_id in (
        select organization_id from user_roles
        where user_id = auth.uid() and role = 'insurer'
      )
    ))
  );

-- 9. Functie: verzekeraar kan dossier blokkeren (legal hold)
create or replace function insurer_block_dossier(p_dossier_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare 
  v_insurer_org uuid;
begin
  -- Check if user is insurer
  select organization_id into v_insurer_org
  from user_roles
  where user_id = auth.uid() and role = 'insurer'
  limit 1;

  if v_insurer_org is null then
    raise exception 'Not authorized: user is not an insurer';
  end if;

  -- Update claim status
  update claims
     set status = 'BLOCKED',
         blocked_reason = nullif(trim(p_reason),'')
   where dossier_id = p_dossier_id
     and insurer_org_id = v_insurer_org;

  -- Set legal hold on dossier
  update dossiers
     set legal_hold = true,
         legal_hold_active = true,
         legal_hold_authority = 'INSURER',
         legal_hold_case_number = 'BLOCKED_BY_INSURER'
   where id = p_dossier_id;

  -- Log event
  insert into dossier_events(dossier_id, event_type, event_description, created_by, metadata)
  values (
    p_dossier_id, 
    'INSURER_HOLD_PLACED', 
    'Verzekeraar heeft blokkade geplaatst',
    auth.uid(),
    jsonb_build_object('reason', p_reason, 'insurer_org_id', v_insurer_org)
  );

  -- Audit log
  insert into audit_events(user_id, event_type, target_type, target_id, dossier_id, description, metadata)
  values (
    auth.uid(),
    'INSURER_BLOCK_DOSSIER',
    'Dossier',
    p_dossier_id,
    p_dossier_id,
    'Verzekeraar blokkeerde dossier',
    jsonb_build_object('reason', p_reason, 'insurer_org_id', v_insurer_org)
  );
end $$;

grant execute on function insurer_block_dossier(uuid, text) to authenticated;