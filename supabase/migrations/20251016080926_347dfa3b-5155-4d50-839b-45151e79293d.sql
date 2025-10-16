-- Verwijder duplicaat notification functies en triggers die 'ARCHIVED' bevatten
DROP TRIGGER IF EXISTS trigger_notify_family_dossier_completed ON dossiers CASCADE;
DROP FUNCTION IF EXISTS notify_family_dossier_completed() CASCADE;

DROP TRIGGER IF EXISTS trigger_notify_mortuarium_dossier_completed ON dossiers CASCADE;
DROP FUNCTION IF EXISTS notify_mortuarium_dossier_completed() CASCADE;