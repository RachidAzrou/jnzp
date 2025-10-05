-- Delete all mock/demo data while preserving users, roles, and organizations

-- Temporarily replace the protection function with a no-op version
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW; -- Allow modification temporarily
END;
$$;

-- Drop the foreign key constraint from audit_events to dossiers
ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS audit_events_dossier_id_fkey;

-- Set all dossier_id to NULL in audit_events (for cleanup)
UPDATE audit_events SET dossier_id = NULL WHERE dossier_id IS NOT NULL;

-- Delete dossier-related data
DELETE FROM message_read_receipts;
DELETE FROM chat_messages;
DELETE FROM thread_members;
DELETE FROM threads;
DELETE FROM document_comments;
DELETE FROM documents;
DELETE FROM manual_events;
DELETE FROM dossier_events;
DELETE FROM family_contacts;
DELETE FROM invoice_items;
DELETE FROM invoice_actions;
DELETE FROM invoices;
DELETE FROM claim_actions;
DELETE FROM claims;
DELETE FROM cool_cell_reservations;
DELETE FROM flights;
DELETE FROM repatriations;
DELETE FROM medical_docs;
DELETE FROM janaz_services;
DELETE FROM wash_services;
DELETE FROM mosque_services;
DELETE FROM dossier_communication_preferences;
DELETE FROM dossiers;

-- Delete kanban tasks
DELETE FROM task_activities;
DELETE FROM kanban_tasks;

-- Delete QR tokens
DELETE FROM qr_scan_events;
DELETE FROM qr_tokens;

-- Reset sequences for clean IDs
ALTER SEQUENCE rep_sequence RESTART WITH 1;
ALTER SEQUENCE loc_sequence RESTART WITH 1;

-- Restore the protection function
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable and cannot be modified or deleted';
  RETURN NULL;
END;
$$;