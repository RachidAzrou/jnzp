-- Trigger om taken automatisch aan te maken bij dossier creatie en status wijziging
CREATE OR REPLACE FUNCTION trigger_seed_dossier_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Roep de edge function aan om taken te seeden
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/seed-dossier-tasks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'dossierId', NEW.id,
      'status', NEW.status,
      'flow', NEW.flow
    )
  );
  
  RETURN NEW;
END;
$$;

-- Trigger bij nieuwe dossiers (CREATED status)
DROP TRIGGER IF EXISTS seed_tasks_on_dossier_insert ON dossiers;
CREATE TRIGGER seed_tasks_on_dossier_insert
  AFTER INSERT ON dossiers
  FOR EACH ROW
  WHEN (NEW.status = 'CREATED')
  EXECUTE FUNCTION trigger_seed_dossier_tasks();

-- Trigger bij status wijzigingen
DROP TRIGGER IF EXISTS seed_tasks_on_status_change ON dossiers;
CREATE TRIGGER seed_tasks_on_status_change
  AFTER UPDATE ON dossiers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_seed_dossier_tasks();