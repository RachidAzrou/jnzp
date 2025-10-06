-- Create function to check if a role is allowed (only the 7 active roles)
create or replace function public.is_allowed_role(p_role app_role)
returns boolean
language sql
immutable
as $$
  select p_role in (
    'platform_admin',
    'org_admin', 
    'funeral_director',
    'wasplaats',
    'mosque',
    'insurer',
    'family'
  )
$$;

-- Add RLS policy to prevent assigning disallowed roles on INSERT
create policy "Only allowed roles can be assigned"
on public.user_roles
for insert
with check (is_allowed_role(role));

-- Add RLS policy to prevent updating to disallowed roles
create policy "Only allowed roles can be updated"
on public.user_roles
for update
with check (is_allowed_role(role));

-- Clean up existing assignments of deprecated roles
delete from public.user_roles 
where role in ('admin', 'reviewer', 'support');