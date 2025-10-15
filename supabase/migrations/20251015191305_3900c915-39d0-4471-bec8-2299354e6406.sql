-- Fix critical security issues

-- 1. Add RLS policies to notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow system to insert notifications (via triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Add RLS policies to admin_notifications table
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view admin notifications
CREATE POLICY "Platform admins can view admin notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'platform_admin'
    AND is_active = true
  )
);

-- Only platform admins can update admin notifications
CREATE POLICY "Platform admins can update admin notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'platform_admin'
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'platform_admin'
    AND is_active = true
  )
);

-- Allow system to insert admin notifications
CREATE POLICY "System can insert admin notifications"
ON public.admin_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Fix SECURITY DEFINER functions to include search_path

-- Recreate get_platform_admin_users with proper search_path
CREATE OR REPLACE FUNCTION public.get_platform_admin_users()
RETURNS TABLE(user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'platform_admin'
  AND ur.is_active = true;
$$;

-- Fix check_organization_admin function
CREATE OR REPLACE FUNCTION public.check_organization_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND is_admin = true
    AND is_active = true
  );
END;
$$;

-- Fix has_platform_admin_role function
CREATE OR REPLACE FUNCTION public.has_platform_admin_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'platform_admin'
    AND is_active = true
  );
$$;

-- 4. Drop and recreate the SECURITY DEFINER view as a function instead
DROP VIEW IF EXISTS public.user_organization_roles;

CREATE OR REPLACE FUNCTION public.get_user_organization_roles(target_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  role TEXT,
  organization_id UUID,
  organization_name TEXT,
  organization_type TEXT,
  is_admin BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.user_id,
    ur.role::TEXT,
    ur.organization_id,
    o.name as organization_name,
    o.type::TEXT as organization_type,
    ur.is_admin
  FROM public.user_roles ur
  LEFT JOIN public.organizations o ON ur.organization_id = o.id
  WHERE ur.is_active = true
  AND (target_user_id IS NULL OR ur.user_id = target_user_id)
  AND (
    ur.user_id = auth.uid() -- Users can see their own roles
    OR EXISTS ( -- Platform admins can see all roles
      SELECT 1 FROM public.user_roles admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.role = 'platform_admin'
      AND admin_check.is_active = true
    )
  );
$$;