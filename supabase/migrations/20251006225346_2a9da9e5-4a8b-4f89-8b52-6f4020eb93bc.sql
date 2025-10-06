-- Add UPDATE policy for platform_admin to manage organizations
CREATE POLICY "Platform admins can update organizations"
ON public.organizations
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'platform_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'platform_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);