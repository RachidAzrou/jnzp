-- Remove the problematic trigger from case_events that causes air_waybill errors
DROP TRIGGER IF EXISTS auto_complete_tasks_from_case_events ON case_events;

-- Also drop any other auto-complete triggers that shouldn't be on case_events
DROP TRIGGER IF EXISTS auto_complete_from_case_events ON case_events;
DROP TRIGGER IF EXISTS trigger_auto_complete_tasks ON case_events;