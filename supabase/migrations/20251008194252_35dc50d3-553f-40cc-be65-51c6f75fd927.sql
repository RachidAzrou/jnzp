-- Fix infinite recursion in RLS policies for mosque role
-- Drop problematic policies
drop policy if exists "Mosque can view dossiers with their services" on public.dossiers;
drop policy if exists "Mosque can view their own mosque services" on public.case_events;
drop policy if exists "Mosque can view own organization" on public.organizations;

-- Create security definer function to check if user's mosque has an event for a dossier
create or replace function public.user_mosque_has_event_for_dossier(_user_id uuid, _dossier_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.case_events ce
    join public.user_roles ur on ur.user_id = _user_id and ur.role = 'mosque'
    where ce.event_type = 'MOSQUE_SERVICE'
      and ce.dossier_id = _dossier_id
      and (ce.metadata->>'mosque_org_id')::uuid = ur.organization_id
  )
$$;

-- Create security definer function to check if case_event belongs to user's mosque
create or replace function public.case_event_belongs_to_user_mosque(_user_id uuid, _event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.case_events ce
    join public.user_roles ur on ur.user_id = _user_id and ur.role = 'mosque'
    where ce.id = _event_id
      and ce.event_type = 'MOSQUE_SERVICE'
      and (ce.metadata->>'mosque_org_id')::uuid = ur.organization_id
  )
$$;

-- Recreate policies using security definer functions
create policy "Mosque can view dossiers with their services"
on public.dossiers
for select
to authenticated
using (
  has_role(auth.uid(), 'mosque') 
  and user_mosque_has_event_for_dossier(auth.uid(), id)
);

create policy "Mosque can view their own mosque services"
on public.case_events
for select
to authenticated
using (
  has_role(auth.uid(), 'mosque')
  and event_type = 'MOSQUE_SERVICE'
  and case_event_belongs_to_user_mosque(auth.uid(), id)
);

create policy "Mosque can view own organization"
on public.organizations
for select
to authenticated
using (
  has_role(auth.uid(), 'mosque')
  and id in (
    select organization_id 
    from public.user_roles 
    where user_id = auth.uid() and role = 'mosque'
  )
);