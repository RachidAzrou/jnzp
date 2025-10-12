-- Create a view for readable dossier status labels with valid enum values
CREATE OR REPLACE VIEW public.vw_dossier_status_labels AS
SELECT 
  d.id,
  d.status,
  d.display_id,
  d.deceased_name,
  d.updated_at,
  CASE d.status
    WHEN 'CREATED' THEN 'Nieuw dossier aangemaakt'
    WHEN 'INTAKE_IN_PROGRESS' THEN 'Intake lopend'
    WHEN 'DOCS_PENDING' THEN 'Documenten in behandeling'
    WHEN 'FD_ASSIGNED' THEN 'FD toegewezen'
    WHEN 'DOCS_VERIFIED' THEN 'Documenten gecontroleerd'
    WHEN 'APPROVED' THEN 'Goedgekeurd door verzekeraar'
    WHEN 'LEGAL_HOLD' THEN 'Juridische blokkade (Parket)'
    WHEN 'PLANNING' THEN 'Planningfase gestart'
    WHEN 'READY_FOR_TRANSPORT' THEN 'Klaar voor uitvoering'
    WHEN 'IN_TRANSIT' THEN 'In uitvoering'
    WHEN 'FINANCIAL_SETTLEMENT' THEN 'Financiële afhandeling'
    WHEN 'ARCHIVED' THEN 'Afgerond & gearchiveerd'
    ELSE d.status::text
  END as status_label,
  CASE d.status
    WHEN 'CREATED' THEN 'Dossier is aangemaakt en wacht op intake'
    WHEN 'INTAKE_IN_PROGRESS' THEN 'Gegevens en eerste documenten worden verzameld'
    WHEN 'DOCS_PENDING' THEN 'Documenten worden ingediend en gecontroleerd'
    WHEN 'FD_ASSIGNED' THEN 'Funeral director is toegewezen aan het dossier'
    WHEN 'DOCS_VERIFIED' THEN 'Alle documenten zijn gecontroleerd en goedgekeurd'
    WHEN 'APPROVED' THEN 'Verzekeraar heeft het dossier goedgekeurd'
    WHEN 'LEGAL_HOLD' THEN 'Dossier is geblokkeerd door het Parket'
    WHEN 'PLANNING' THEN 'Planning van moskee en mortuarium wordt gemaakt'
    WHEN 'READY_FOR_TRANSPORT' THEN 'Alle voorbereidingen zijn klaar'
    WHEN 'IN_TRANSIT' THEN 'Transport is bezig'
    WHEN 'FINANCIAL_SETTLEMENT' THEN 'Facturen worden verwerkt'
    WHEN 'ARCHIVED' THEN 'Dossier is afgerond en gearchiveerd'
    ELSE NULL
  END as status_description,
  d.legal_hold,
  d.legal_hold_active,
  d.assigned_fd_org_id,
  d.flow
FROM dossiers d;

-- Grant select permissions
GRANT SELECT ON public.vw_dossier_status_labels TO authenticated;