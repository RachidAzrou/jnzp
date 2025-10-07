-- Fix organizations.requested_by foreign key to set NULL on user deletion
ALTER TABLE organizations 
DROP CONSTRAINT IF EXISTS organizations_requested_by_fkey;

ALTER TABLE organizations
ADD CONSTRAINT organizations_requested_by_fkey 
FOREIGN KEY (requested_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Also fix organizations.approved_by if it exists
ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_approved_by_fkey;

ALTER TABLE organizations
ADD CONSTRAINT organizations_approved_by_fkey 
FOREIGN KEY (approved_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;