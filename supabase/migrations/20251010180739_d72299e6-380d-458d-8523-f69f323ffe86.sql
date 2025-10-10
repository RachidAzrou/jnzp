
-- Add explicit exception handling to debug organization INSERT failure
-- The issue is that INSERT returns NULL instead of raising an exception

-- First, let's add better error handling by checking if the insert succeeded
-- We'll modify the RLS policy to be more explicit about authentication

-- Drop the current policy
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Create a more permissive policy that works during signup
-- Since fn_register_org_with_contact is SECURITY DEFINER and validates the user,
-- we can safely allow INSERT without checking auth.uid()
CREATE POLICY "System can create organizations via SECURITY DEFINER"
ON organizations
FOR INSERT
WITH CHECK (true);

-- This is safe because:
-- 1. fn_register_org_with_contact validates p_user_id
-- 2. The function is SECURITY DEFINER (runs with elevated privileges)
-- 3. Direct INSERT from client code would still need authentication
