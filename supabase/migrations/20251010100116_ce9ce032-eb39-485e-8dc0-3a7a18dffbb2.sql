
-- Fix: Voeg email toe aan profile creation in trigger
DROP TRIGGER IF EXISTS trg_auth_users_after_insert ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role app_role;
BEGIN
  -- Haal de rol op uit metadata
  v_user_role := (NEW.raw_user_meta_data->>'role')::app_role;
  
  -- Maak ALTIJD een profiel aan MET EMAIL
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,  -- <-- DIT ONTBRAK!
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Voor family rol: direct toewijzen
  IF v_user_role = 'family' THEN
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (NEW.id, 'family', NULL)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_users_after_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();
