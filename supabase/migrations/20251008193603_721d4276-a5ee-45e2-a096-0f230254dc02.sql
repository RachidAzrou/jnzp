-- Moskee-view: alleen janazah-relevante velden
-- Toon alleen deceased_name, planning, en laatste MOSQUE_SERVICE event

create or replace view public.dossiers_mosque_view as
with latest_mosque as (
  select distinct on (ce.dossier_id)
         ce.dossier_id,
         ce.id                as mosque_event_id,
         ce.scheduled_at      as janazah_at,
         ce.location_text     as janazah_location,
         ce.status            as mosque_event_status,
         ce.created_at        as mosque_event_created_at
  from public.case_events ce
  where ce.event_type = 'MOSQUE_SERVICE'
  order by ce.dossier_id, ce.scheduled_at desc, ce.created_at desc
),
fd_org as (
  select o.id as org_id, o.name as org_name
  from public.organizations o
)
select
  d.id                         as dossier_id,
  d.display_id,
  d.deceased_name,
  -- Familie achternaam voor rouwberichten
  regexp_replace(
    trim(split_part(d.deceased_name, ' ', 
      array_length(regexp_split_to_array(d.deceased_name, '\s+'),1)
    )), 
    '[^\p{L}\p{M}\-'' ]', '', 'g'
  ) as family_name_for_notice,
  d.flow,
  d.status,

  -- Moskee-event info
  lm.mosque_event_id,
  lm.janazah_at,
  lm.janazah_location,
  lm.mosque_event_status,

  -- FD-organisatie (alleen naam, geen contactinfo)
  fo.org_name as fd_org_name

from public.dossiers d
left join latest_mosque lm
       on lm.dossier_id = d.id
left join fd_org fo
       on fo.org_id = d.assigned_fd_org_id

-- Alleen statussen die voor moskee relevant zijn
where d.status in ('APPROVED','PLANNING','READY_FOR_TRANSPORT','IN_TRANSIT','ARCHIVED');

-- RLS-policies voor moskee rol
-- Moskee ziet alleen dossiers met hun eigen MOSQUE_SERVICE events

-- Policy voor dossiers: moskee ziet alleen dossiers met hun mosque events
create policy "Mosque can view dossiers with their services"
on public.dossiers
for select
to authenticated
using (
  has_role(auth.uid(), 'mosque') 
  and exists (
    select 1
    from public.case_events ce
    join public.user_roles ur
      on ur.user_id = auth.uid()
     and ur.role = 'mosque'
    where ce.event_type = 'MOSQUE_SERVICE'
      and ce.dossier_id = dossiers.id
      and ce.metadata->>'mosque_org_id' = ur.organization_id::text
  )
);

-- Policy voor case_events: moskee ziet alleen eigen MOSQUE_SERVICE events  
create policy "Mosque can view their own mosque services"
on public.case_events
for select
to authenticated
using (
  has_role(auth.uid(), 'mosque')
  and event_type = 'MOSQUE_SERVICE'
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'mosque'
      and ur.organization_id::text = case_events.metadata->>'mosque_org_id'
  )
);

-- Policy voor organizations: moskee ziet alleen eigen org
create policy "Mosque can view own organization"
on public.organizations
for select
to authenticated
using (
  has_role(auth.uid(), 'mosque')
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.organization_id = organizations.id
      and ur.role = 'mosque'
  )
);