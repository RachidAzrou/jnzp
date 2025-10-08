-- Vereenvoudigde moskee janazah service via case_events
-- We gebruiken case_events.event_type='MOSQUE_SERVICE' voor janazah gebeden

-- Verwijder oude mosque_services tabel (indien aanwezig)
DROP TABLE IF EXISTS mosque_services CASCADE;

-- Voeg location_text toe aan case_events voor moskee/mortuarium/begraafplaats locatie
ALTER TABLE case_events 
ADD COLUMN IF NOT EXISTS location_text TEXT;

-- Index voor sneller zoeken op moskee services
CREATE INDEX IF NOT EXISTS idx_case_events_mosque 
ON case_events(event_type) 
WHERE event_type = 'MOSQUE_SERVICE';

-- Functie om één janazah per dossier af te dwingen
CREATE OR REPLACE FUNCTION prevent_duplicate_janazah()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check of er al een MOSQUE_SERVICE is voor dit dossier
  IF NEW.event_type = 'MOSQUE_SERVICE' THEN
    IF EXISTS (
      SELECT 1 FROM case_events 
      WHERE dossier_id = NEW.dossier_id 
        AND event_type = 'MOSQUE_SERVICE'
        AND id != COALESCE(NEW.id, gen_random_uuid())
    ) THEN
      RAISE EXCEPTION 'Er bestaat al een janazah service voor dit dossier';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger voor prevent_duplicate_janazah
DROP TRIGGER IF EXISTS prevent_duplicate_janazah_trigger ON case_events;
CREATE TRIGGER prevent_duplicate_janazah_trigger
  BEFORE INSERT OR UPDATE ON case_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_janazah();

-- RLS policies voor moskee organisaties
DROP POLICY IF EXISTS "Mosque can view mosque services" ON case_events;
CREATE POLICY "Mosque can view mosque services"
  ON case_events
  FOR SELECT
  USING (
    event_type = 'MOSQUE_SERVICE' AND
    (
      has_role(auth.uid(), 'mosque'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  );

DROP POLICY IF EXISTS "Mosque can update mosque services" ON case_events;
CREATE POLICY "Mosque can update mosque services"
  ON case_events
  FOR UPDATE
  USING (
    event_type = 'MOSQUE_SERVICE' AND
    has_role(auth.uid(), 'mosque'::app_role)
  );

-- Audit logging voor janazah statuswijzigingen
CREATE OR REPLACE FUNCTION log_janazah_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type = 'MOSQUE_SERVICE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO dossier_events (
      dossier_id,
      event_type,
      event_description,
      created_by,
      metadata
    ) VALUES (
      NEW.dossier_id,
      'MOSQUE_STATUS_CHANGED',
      'Janazah status gewijzigd van ' || OLD.status || ' naar ' || NEW.status,
      auth.uid(),
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'location', NEW.location_text,
        'scheduled_at', NEW.scheduled_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_janazah_status_change_trigger ON case_events;
CREATE TRIGGER log_janazah_status_change_trigger
  AFTER UPDATE ON case_events
  FOR EACH ROW
  WHEN (NEW.event_type = 'MOSQUE_SERVICE')
  EXECUTE FUNCTION log_janazah_status_change();