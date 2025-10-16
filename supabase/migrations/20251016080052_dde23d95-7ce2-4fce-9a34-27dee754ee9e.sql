-- Fix vw_dossier_status_labels view to remove 'ARCHIVED' references
DROP VIEW IF EXISTS public.vw_dossier_status_labels CASCADE;

CREATE OR REPLACE VIEW public.vw_dossier_status_labels AS
SELECT 
  d.id,
  d.status,
  d.display_id,
  d.deceased_name,
  d.updated_at,
  CASE d.status
    WHEN 'CREATED' THEN 'Nieuw dossier'
    WHEN 'IN_PROGRESS' THEN 'In behandeling'
    WHEN 'UNDER_REVIEW' THEN 'In controle'
    WHEN 'COMPLETED' THEN 'Operationeel afgerond'
    WHEN 'CLOSED' THEN 'Gearchiveerd'
    ELSE d.status::text
  END as status_label,
  CASE d.status
    WHEN 'CREATED' THEN 'Dossier is aangemaakt en wacht op intake'
    WHEN 'IN_PROGRESS' THEN 'Dossier is in behandeling'
    WHEN 'UNDER_REVIEW' THEN 'Dossier wordt gecontroleerd'
    WHEN 'COMPLETED' THEN 'Alle operationele taken zijn afgerond'
    WHEN 'CLOSED' THEN 'Dossier is afgerond en gearchiveerd'
    ELSE NULL
  END as status_description,
  d.legal_hold,
  d.legal_hold_active,
  d.assigned_fd_org_id,
  d.flow
FROM dossiers d;

GRANT SELECT ON public.vw_dossier_status_labels TO authenticated;