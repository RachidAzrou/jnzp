
-- Reset het wachtwoord voor razrou@outlook.be naar een tijdelijk wachtwoord
-- Wachtwoord: TempAdmin2025!

UPDATE auth.users
SET 
  encrypted_password = crypt('TempAdmin2025!', gen_salt('bf')),
  updated_at = now()
WHERE email = 'razrou@outlook.be';
