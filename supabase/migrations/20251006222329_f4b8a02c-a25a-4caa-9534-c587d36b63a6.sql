
-- Stap 1: Vind de platform admin user
-- Stap 2: Verwijder alle audit events (we starten clean)
-- Stap 3: Verwijder alle users behalve razrou@outlook.be
-- Stap 4: Geef platform_admin rol

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Vind de user_id van razrou@outlook.be
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'razrou@outlook.be';

  -- Verwijder ALLE audit events (we beginnen opnieuw)
  TRUNCATE TABLE audit_events CASCADE;

  -- Verwijder alle andere users
  DELETE FROM auth.users
  WHERE email != 'razrou@outlook.be';

  -- Geef razrou@outlook.be de platform_admin rol
  INSERT INTO user_roles (user_id, role, organization_id)
  VALUES (admin_user_id, 'platform_admin', NULL)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
