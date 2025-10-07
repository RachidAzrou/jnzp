-- DEFINITIEVE FIX voor infinite recursion in user_roles RLS policies
-- Probleem: Policies op user_roles doen queries OP user_roles = oneindige recursie

-- 1. Drop alle bestaande problematische policies op user_roles
DROP POLICY IF EXISTS "Org admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Org admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- 2. Maak security definer functies die BUITEN RLS om werken
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND is_admin = true
  )
$$;

CREATE OR REPLACE FUNCTION public.user_in_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- 3. Maak nieuwe veilige RLS policies voor user_roles die GEEN recursie veroorzaken
-- Gebruikers kunnen hun eigen roles zien
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Org admins kunnen roles beheren - gebruikt security definer functie
CREATE POLICY "Org admins can manage roles in their org"
ON public.user_roles
FOR ALL
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Platform admins kunnen alles
CREATE POLICY "Platform admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'platform_admin'));

-- 4. Fix profiles policy om security definer functie te gebruiken
CREATE POLICY "Org admins can manage profiles in their org"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = profiles.id
      AND public.is_org_admin(auth.uid(), ur.organization_id)
  )
  OR public.has_role(auth.uid(), 'platform_admin')
);