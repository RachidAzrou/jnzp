-- Fix trigger_seed_dossier_tasks to use app_setting function instead of current_setting
CREATE OR REPLACE FUNCTION trigger_seed_dossier_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call edge function to seed tasks using the app_setting wrapper
  PERFORM net.http_post(
    url := app_setting('supabase_url', 'https://yupqrawkrpyfrdzxssdk.supabase.co') || '/functions/v1/seed-dossier-tasks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || app_setting('service_role_key', '')
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