-- Cleanup: Drop oude RPC functie (niet meer nodig, vervangen door Edge Function)
DROP FUNCTION IF EXISTS public.register_professional_user(uuid, text, text, text, text, text, text, text);

-- Note: Triggers zijn al eerder gedropped, maar ter zekerheid:
DROP TRIGGER IF EXISTS trg_auth_users_after_insert ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role();