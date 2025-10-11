-- Remove the trigger that automatically creates user_roles when an organization is inserted
-- This conflicts with the register-professional Edge Function

DROP TRIGGER IF EXISTS handle_new_org_registration ON public.organizations;
DROP FUNCTION IF EXISTS public.handle_new_org_registration();