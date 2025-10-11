-- Database Cleanup: Remove incomplete registrations

-- 1. Remove organizations without any user_roles
DELETE FROM public.organizations
WHERE id NOT IN (
  SELECT DISTINCT organization_id 
  FROM public.user_roles 
  WHERE organization_id IS NOT NULL
)
AND verification_status = 'PENDING_VERIFICATION';

-- 2. Remove profiles without user_roles
DELETE FROM public.profiles
WHERE id NOT IN (
  SELECT DISTINCT user_id 
  FROM public.user_roles
);

-- Note: Auth users cleanup will happen via trigger when profile is deleted (ON DELETE CASCADE)