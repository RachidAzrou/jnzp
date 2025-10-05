-- Fix create_dossier_threads function - make created_by nullable or use a system user
CREATE OR REPLACE FUNCTION public.create_dossier_threads()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  family_thread_id UUID;
  insurer_thread_id UUID;
  creator_id UUID;
BEGIN
  -- Use auth.uid() if available, otherwise use the first admin user or NULL
  creator_id := COALESCE(
    auth.uid(),
    (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1)
  );
  
  -- Create family thread (Familie ⇄ FD)
  INSERT INTO threads (type, dossier_id, created_by, name)
  VALUES ('dossier_family', NEW.id, creator_id, 'Familie Chat')
  RETURNING id INTO family_thread_id;
  
  -- Create insurer thread (FD ⇄ Verzekeraar) if insurer assigned
  IF NEW.insurer_org_id IS NOT NULL THEN
    INSERT INTO threads (type, dossier_id, created_by, name)
    VALUES ('dossier_insurer', NEW.id, creator_id, 'Verzekeraar Chat')
    RETURNING id INTO insurer_thread_id;
  END IF;
  
  RETURN NEW;
END;
$function$;