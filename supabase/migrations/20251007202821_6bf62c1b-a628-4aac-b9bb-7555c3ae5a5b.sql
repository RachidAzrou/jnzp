-- Create function to generate unique QR tokens
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 32-character token
    new_token := encode(gen_random_bytes(24), 'base64');
    new_token := replace(replace(replace(new_token, '+', ''), '/', ''), '=', '');
    new_token := substring(new_token, 1, 32);
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM qr_tokens WHERE token = new_token) INTO token_exists;
    
    -- If token is unique, exit loop
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN new_token;
END;
$$;