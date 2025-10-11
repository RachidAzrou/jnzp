-- Remove the trigger that automatically creates user_roles on organization insert
-- This is causing NULL user_id violations during registration

DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
DROP FUNCTION IF EXISTS public.handle_new_organization();