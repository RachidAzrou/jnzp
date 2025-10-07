
-- Drop the existing policy
DROP POLICY IF EXISTS "FD can view own organization dossiers" ON dossiers;

-- Recreate with support for pending claims
CREATE POLICY "FD can view own organization dossiers" 
ON dossiers 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    has_role(auth.uid(), 'funeral_director'::app_role) 
    AND user_org_is_approved(auth.uid()) 
    AND (
      -- Can view dossiers assigned to their org
      assigned_fd_org_id IN (
        SELECT organization_id 
        FROM user_roles 
        WHERE user_id = auth.uid()
      )
      -- Can view unassigned dossiers
      OR assignment_status = 'UNASSIGNED'
      -- Can view dossiers with pending claims by their org
      OR id IN (
        SELECT dossier_id 
        FROM dossier_claims 
        WHERE requesting_org_id IN (
          SELECT organization_id 
          FROM user_roles 
          WHERE user_id = auth.uid()
        )
        AND status = 'PENDING'
      )
    )
  )
);
