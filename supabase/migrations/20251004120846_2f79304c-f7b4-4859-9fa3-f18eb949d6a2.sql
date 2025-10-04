-- Drop problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view thread members of their threads" ON thread_members;
DROP POLICY IF EXISTS "Admins can manage thread members" ON thread_members;

-- Create security definer function to check thread membership
CREATE OR REPLACE FUNCTION is_thread_member(p_thread_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM thread_members
    WHERE thread_id = p_thread_id
      AND user_id = p_user_id
  )
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view their thread memberships"
ON thread_members FOR SELECT
USING (
  user_id = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'platform_admin'::app_role)
);

CREATE POLICY "Admins can manage thread members"
ON thread_members FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'org_admin'::app_role) OR
  has_role(auth.uid(), 'funeral_director'::app_role) OR
  has_role(auth.uid(), 'platform_admin'::app_role)
);

-- Update threads policy to use the security definer function
DROP POLICY IF EXISTS "Users can view threads they are members of" ON threads;

CREATE POLICY "Users can view threads they are members of"
ON threads FOR SELECT
USING (
  is_thread_member(id, auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'platform_admin'::app_role)
);

-- Update chat_messages policy to use the security definer function  
DROP POLICY IF EXISTS "Users can view messages in their threads" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their threads" ON chat_messages;

CREATE POLICY "Users can view messages in their threads"
ON chat_messages FOR SELECT
USING (
  thread_id IS NULL OR -- Legacy messages
  is_thread_member(thread_id, auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'platform_admin'::app_role)
);

CREATE POLICY "Users can insert messages in their threads"
ON chat_messages FOR INSERT
WITH CHECK (
  thread_id IS NULL OR -- Legacy
  is_thread_member(thread_id, auth.uid())
);