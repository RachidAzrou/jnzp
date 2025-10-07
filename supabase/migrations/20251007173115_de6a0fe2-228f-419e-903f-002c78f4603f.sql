-- Fix audit_events foreign key to set NULL on user deletion instead of failing
-- This preserves audit history while allowing user deletion

ALTER TABLE audit_events 
DROP CONSTRAINT IF EXISTS audit_events_user_id_fkey;

ALTER TABLE audit_events
ADD CONSTRAINT audit_events_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;