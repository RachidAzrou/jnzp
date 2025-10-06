-- Remove existing FD view policy
DROP POLICY IF EXISTS "FD can view their own reviews" ON fd_reviews;

-- Update to only allow insurers and admins to view reviews
CREATE POLICY "Only insurers and admins can view reviews"
ON fd_reviews
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'insurer'::app_role)
);