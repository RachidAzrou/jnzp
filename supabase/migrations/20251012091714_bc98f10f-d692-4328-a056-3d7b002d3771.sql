-- Create security definer function to check if user has access to case events via family contact
CREATE OR REPLACE FUNCTION public.user_has_family_case_event_access(_user_id uuid, _dossier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_contacts fc
    JOIN auth.users u ON u.email = fc.email
    WHERE fc.dossier_id = _dossier_id
      AND u.id = _user_id
  )
$$;

-- Drop the old problematic policy
DROP POLICY IF EXISTS "Family can view case events for their dossiers" ON case_events;

-- Create new policy using the security definer function
CREATE POLICY "Family can view case events for their dossiers" 
ON case_events 
FOR SELECT 
USING (
  has_role(auth.uid(), 'family') 
  AND user_has_family_case_event_access(auth.uid(), dossier_id)
);