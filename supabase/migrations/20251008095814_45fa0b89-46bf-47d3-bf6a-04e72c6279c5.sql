-- Drop the trigger and function that cause the "net schema" error
DROP TRIGGER IF EXISTS trigger_obituary_on_janazah_planned ON case_events;
DROP FUNCTION IF EXISTS trigger_obituary_generation();

-- We'll call the obituary generation from the application code instead
-- when janazah status changes to PLANNED