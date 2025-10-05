-- Update de foreign key constraint zodat bij delete van user de user_id NULL wordt
ALTER TABLE audit_events 
DROP CONSTRAINT IF EXISTS audit_events_user_id_fkey;

ALTER TABLE audit_events
ADD CONSTRAINT audit_events_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;