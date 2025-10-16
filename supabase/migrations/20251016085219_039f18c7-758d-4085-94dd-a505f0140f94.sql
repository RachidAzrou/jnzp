-- Voeg een check functie toe om te controleren op actieve reservaties voor een dossier
CREATE OR REPLACE FUNCTION check_active_reservations_for_dossier(p_dossier_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM cool_cell_reservations
    WHERE dossier_id = p_dossier_id
      AND status IN ('PENDING', 'CONFIRMED', 'OCCUPIED')
  );
END;
$$;

-- Voeg een trigger functie toe om nieuwe reservaties te valideren
CREATE OR REPLACE FUNCTION validate_cool_cell_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check of er al een actieve reservatie bestaat voor dit dossier
  IF check_active_reservations_for_dossier(NEW.dossier_id) THEN
    RAISE EXCEPTION 'Reeds een actieve reservatie voor dit dossier. Annuleer eerst de bestaande reservatie.'
      USING HINT = 'Een dossier kan maar één actieve koelcelreservatie hebben',
            ERRCODE = '23505'; -- unique_violation code
  END IF;
  
  RETURN NEW;
END;
$$;

-- Voeg de trigger toe aan de cool_cell_reservations tabel
DROP TRIGGER IF EXISTS validate_reservation_before_insert ON cool_cell_reservations;
CREATE TRIGGER validate_reservation_before_insert
  BEFORE INSERT ON cool_cell_reservations
  FOR EACH ROW
  WHEN (NEW.status IN ('PENDING', 'CONFIRMED', 'OCCUPIED'))
  EXECUTE FUNCTION validate_cool_cell_reservation();

-- Voeg ook een index toe voor betere performance
CREATE INDEX IF NOT EXISTS idx_cool_cell_reservations_dossier_status 
  ON cool_cell_reservations(dossier_id, status)
  WHERE status IN ('PENDING', 'CONFIRMED', 'OCCUPIED');