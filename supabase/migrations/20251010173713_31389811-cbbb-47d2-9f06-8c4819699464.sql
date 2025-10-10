-- Fix Security Issue 1: Add storage bucket constraints for file validation
UPDATE storage.buckets 
SET 
  file_size_limit = 10485760, -- 10MB max file size
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg', 
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE name IN ('dossier-documents', 'flight-attachments');

-- Fix Security Issue 2: Recreate audit_log_view without SECURITY DEFINER
DROP VIEW IF EXISTS public.audit_log_view CASCADE;

CREATE VIEW public.audit_log_view AS
SELECT 
  id,
  user_id,
  event_type,
  target_type,
  target_id,
  description,
  metadata,
  actor_role,
  reason,
  dossier_id,
  payload_diff,
  created_at
FROM public.audit_events;