-- Add language and version columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create index for finding latest obituary version
CREATE INDEX IF NOT EXISTS idx_documents_obituary_version 
ON documents(dossier_id, doc_type, language, version DESC) 
WHERE doc_type = 'OBITUARY_JANAZAH';

-- Function to trigger obituary generation
CREATE OR REPLACE FUNCTION public.trigger_obituary_generation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dossier RECORD;
  v_latest_version INTEGER := 0;
BEGIN
  -- Only trigger for MOSQUE_SERVICE with PLANNED status
  IF NEW.event_type = 'MOSQUE_SERVICE' AND NEW.status = 'PLANNED' THEN
    -- Get dossier details
    SELECT * INTO v_dossier FROM dossiers WHERE id = NEW.dossier_id;
    
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- Check if location and time are set
    IF NEW.scheduled_at IS NULL OR NEW.location_text IS NULL THEN
      RAISE NOTICE 'Obituary generation skipped: missing location or scheduled_at';
      RETURN NEW;
    END IF;
    
    -- Get latest version number for this dossier
    SELECT COALESCE(MAX(version), 0) INTO v_latest_version
    FROM documents
    WHERE dossier_id = NEW.dossier_id
      AND doc_type = 'OBITUARY_JANAZAH';
    
    -- Call edge function to generate obituary (async)
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-obituary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'dossierId', NEW.dossier_id,
        'janazahEventId', NEW.id,
        'newVersion', v_latest_version + 1,
        'deceasedName', v_dossier.deceased_name,
        'displayId', v_dossier.display_id,
        'scheduledAt', NEW.scheduled_at,
        'location', NEW.location_text
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on case_events
DROP TRIGGER IF EXISTS trigger_obituary_on_janazah_planned ON case_events;
CREATE TRIGGER trigger_obituary_on_janazah_planned
AFTER INSERT OR UPDATE OF status, scheduled_at, location_text
ON case_events
FOR EACH ROW
EXECUTE FUNCTION trigger_obituary_generation();