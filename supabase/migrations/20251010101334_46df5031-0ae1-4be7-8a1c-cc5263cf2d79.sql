-- Fix: Gebruik PLATFORM ipv GLOBAL voor platform_admin
UPDATE user_roles
SET scope = 'PLATFORM', organization_id = NULL
WHERE role = 'platform_admin';

-- Cleanup incomplete registratie
DELETE FROM user_roles 
WHERE user_id = 'f2f56871-d50a-43ec-9d8c-0cfbc12e1a08';