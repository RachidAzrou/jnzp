-- Fix SECURITY DEFINER views by recreating them as SECURITY INVOKER
-- This ensures views execute with the querying user's permissions and enforce RLS

-- Drop and recreate audit_log_view
DROP VIEW IF EXISTS public.audit_log_view CASCADE;

CREATE VIEW public.audit_log_view 
WITH (security_invoker = true) AS
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

-- Drop and recreate dossiers_mosque_view
DROP VIEW IF EXISTS public.dossiers_mosque_view CASCADE;

CREATE VIEW public.dossiers_mosque_view
WITH (security_invoker = true) AS
WITH latest_mosque AS (
  SELECT DISTINCT ON (ce.dossier_id) 
    ce.dossier_id,
    ce.id AS mosque_event_id,
    ce.scheduled_at AS janazah_at,
    ce.location_text AS janazah_location,
    ce.status AS mosque_event_status,
    ce.created_at AS mosque_event_created_at
  FROM case_events ce
  WHERE ce.event_type = 'MOSQUE_SERVICE'
  ORDER BY ce.dossier_id, ce.scheduled_at DESC, ce.created_at DESC
), 
fd_org AS (
  SELECT o.id AS org_id, o.name AS org_name
  FROM organizations o
)
SELECT 
  d.id AS dossier_id,
  d.display_id,
  d.deceased_name,
  regexp_replace(
    TRIM(BOTH FROM split_part(d.deceased_name, ' ', array_length(regexp_split_to_array(d.deceased_name, '\s+'), 1))),
    '[^\p{L}\p{M}\-'' ]', '', 'g'
  ) AS family_name_for_notice,
  d.flow,
  d.status,
  lm.mosque_event_id,
  lm.janazah_at,
  lm.janazah_location,
  lm.mosque_event_status,
  fo.org_name AS fd_org_name
FROM dossiers d
LEFT JOIN latest_mosque lm ON lm.dossier_id = d.id
LEFT JOIN fd_org fo ON fo.org_id = d.assigned_fd_org_id
WHERE d.status IN ('APPROVED', 'PLANNING', 'READY_FOR_TRANSPORT', 'IN_TRANSIT', 'ARCHIVED');

-- Drop and recreate v_fd_review_summary
DROP VIEW IF EXISTS public.v_fd_review_summary CASCADE;

CREATE VIEW public.v_fd_review_summary
WITH (security_invoker = true) AS
SELECT 
  fd_org_id,
  ROUND(AVG(rating), 1) AS avg_rating,
  COUNT(*) AS total_reviews,
  (
    SELECT r2.comment
    FROM fd_reviews r2
    WHERE r2.fd_org_id = r1.fd_org_id 
      AND r2.comment IS NOT NULL
    ORDER BY r2.created_at DESC
    LIMIT 1
  ) AS last_comment
FROM fd_reviews r1
GROUP BY fd_org_id;

-- Drop and recreate view_my_dossiers
DROP VIEW IF EXISTS public.view_my_dossiers CASCADE;

CREATE VIEW public.view_my_dossiers
WITH (security_invoker = true) AS
SELECT 
  d.id,
  d.ref_number,
  d.status,
  d.deceased_name,
  d.deceased_dob,
  d.date_of_death,
  d.legal_hold,
  d.require_doc_ref,
  d.assigned_fd_org_id,
  d.insurer_org_id,
  d.created_at,
  d.updated_at,
  d.flow,
  d.display_id,
  d.deceased_gender,
  d.internal_notes,
  d.advisory_checks,
  d.assignment_status,
  fd_org.name AS fd_org_name,
  ins_org.name AS insurer_name,
  COUNT(DISTINCT doc.id) AS document_count,
  COUNT(DISTINCT fc.id) AS contact_count
FROM dossiers d
LEFT JOIN organizations fd_org ON d.assigned_fd_org_id = fd_org.id
LEFT JOIN organizations ins_org ON d.insurer_org_id = ins_org.id
LEFT JOIN documents doc ON d.id = doc.dossier_id
LEFT JOIN family_contacts fc ON d.id = fc.dossier_id
GROUP BY d.id, fd_org.name, ins_org.name;

COMMENT ON VIEW public.audit_log_view IS 'SECURITY INVOKER view - enforces RLS policies of querying user';
COMMENT ON VIEW public.dossiers_mosque_view IS 'SECURITY INVOKER view - enforces RLS policies of querying user';
COMMENT ON VIEW public.v_fd_review_summary IS 'SECURITY INVOKER view - enforces RLS policies of querying user';
COMMENT ON VIEW public.view_my_dossiers IS 'SECURITY INVOKER view - enforces RLS policies of querying user';