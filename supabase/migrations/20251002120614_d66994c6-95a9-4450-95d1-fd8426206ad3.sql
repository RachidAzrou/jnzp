-- Create function to assign default role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign 'family' role by default to new users
  -- This can be changed later by admins
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'family')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically assign role after user creation
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

COMMENT ON FUNCTION public.handle_new_user_role() IS 
  'Automatically assigns the family role to newly registered users. Admins can change roles manually afterwards.';