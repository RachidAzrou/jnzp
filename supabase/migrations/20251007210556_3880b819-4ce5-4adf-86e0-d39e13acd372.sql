-- Drop the existing insert policy
DROP POLICY IF EXISTS "Wasplaats users can insert reservations" ON cool_cell_reservations;

-- Create new policy that allows FD, wasplaats, and admin to insert reservations
CREATE POLICY "FD and wasplaats can insert reservations" 
ON cool_cell_reservations 
FOR INSERT 
WITH CHECK (
  (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'wasplaats'::app_role) OR 
    has_role(auth.uid(), 'funeral_director'::app_role)
  ) 
  AND user_org_is_approved(auth.uid())
);