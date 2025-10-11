-- Fix profile creation by using explicit RPC call instead of auth trigger
-- The auth.users trigger doesn't work due to Supabase reserved schema protection

-- Cleanup: Drop the non-working trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new RPC function for explicit profile creation
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile (idempotent - ignore if exists)
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (p_user_id, p_email, p_first_name, p_last_name, p_phone)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$$;