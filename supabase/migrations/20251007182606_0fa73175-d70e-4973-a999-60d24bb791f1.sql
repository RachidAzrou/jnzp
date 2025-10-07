
-- Fix create_dossier_threads trigger - dossiers table doesn't have created_by
CREATE OR REPLACE FUNCTION create_dossier_threads()
RETURNS TRIGGER AS $$
DECLARE
  creator_id uuid;
  fd_thread_id uuid;
  family_thread_id uuid;
BEGIN
  -- Try to get current authenticated user, fallback to admin, then system UUID
  creator_id := auth.uid();
  
  IF creator_id IS NULL THEN
    SELECT user_id INTO creator_id FROM user_roles WHERE role = 'admin' LIMIT 1;
  END IF;
  
  IF creator_id IS NULL THEN
    creator_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- Create FD thread
  INSERT INTO threads (type, dossier_id, created_by, name)
  VALUES ('dossier_fd', NEW.id, creator_id, 'FD Chat')
  RETURNING id INTO fd_thread_id;

  -- Create Family thread
  INSERT INTO threads (type, dossier_id, created_by, name)
  VALUES ('dossier_family', NEW.id, creator_id, 'Familie Chat')
  RETURNING id INTO family_thread_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
