-- Fix create_dossier_threads function - created_by should be user_id not timestamp
CREATE OR REPLACE FUNCTION public.create_dossier_threads()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  family_thread_id UUID;
  insurer_thread_id UUID;
BEGIN
  -- Create family thread (Familie ⇄ FD)
  INSERT INTO threads (type, dossier_id, created_by, name)
  VALUES ('dossier_family', NEW.id, auth.uid(), 'Familie Chat')
  RETURNING id INTO family_thread_id;
  
  -- Create insurer thread (FD ⇄ Verzekeraar) if insurer assigned
  IF NEW.insurer_org_id IS NOT NULL THEN
    INSERT INTO threads (type, dossier_id, created_by, name)
    VALUES ('dossier_insurer', NEW.id, auth.uid(), 'Verzekeraar Chat')
    RETURNING id INTO insurer_thread_id;
  END IF;
  
  RETURN NEW;
END;
$function$;