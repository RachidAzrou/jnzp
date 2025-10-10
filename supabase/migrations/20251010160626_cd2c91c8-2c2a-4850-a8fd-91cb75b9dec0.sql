-- Drop oude versie van fn_register_org_with_contact (met p_user_id als eerste parameter)
-- Dit lost het PostgREST "could not choose" conflict op

DROP FUNCTION IF EXISTS public.fn_register_org_with_contact(
  uuid, text, text, text, text, text, text, text, text, boolean
);

-- De nieuwe versie (met p_org_type als eerste parameter) blijft behouden
-- Deze staat al in de database en hoeft niet opnieuw aangemaakt te worden