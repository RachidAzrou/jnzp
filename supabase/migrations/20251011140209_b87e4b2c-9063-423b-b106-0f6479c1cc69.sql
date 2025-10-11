-- Drop oude trigger en functie die conflicteren met nieuwe registratie flow
DROP TRIGGER IF EXISTS trg_auth_users_after_insert ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role();