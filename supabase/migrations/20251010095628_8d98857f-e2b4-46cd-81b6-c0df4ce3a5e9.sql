
-- Cleanup half-registered users zodat ze opnieuw kunnen proberen
DELETE FROM auth.users WHERE email IN ('dada@tecnarit.be', 'papa@tecnarit.be');

-- Voor de admin user: zorg dat organization_id NULL mag zijn voor platform_admin
UPDATE user_roles 
SET organization_id = NULL 
WHERE user_id = '43c546c2-7215-46c2-9c87-1eaa8f4f5d19' 
AND role = 'platform_admin';
