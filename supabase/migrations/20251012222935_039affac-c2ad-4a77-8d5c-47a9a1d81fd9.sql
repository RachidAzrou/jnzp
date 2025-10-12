-- Fix trigger that references non-existent task_type column
-- Drop and recreate auto_complete_tasks trigger to remove task_type reference

DROP TRIGGER IF EXISTS auto_complete_case_events ON case_events;

-- The auto_complete_tasks function should only trigger on specific tables
-- Not on case_events inserts, so we remove this trigger
-- The function is still used for documents, claims, invoices, and flights tables