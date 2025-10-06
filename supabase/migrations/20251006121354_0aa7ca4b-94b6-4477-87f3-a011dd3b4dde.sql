
-- Verwijder de foreign key constraint van audit_events
ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS audit_events_organization_id_fkey;

-- Vervang de trigger function tijdelijk met een no-op
CREATE OR REPLACE FUNCTION public.prevent_last_admin_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Tijdelijk uitgeschakeld voor cleanup
  RETURN OLD;
END;
$$;

-- Verwijder alle gerelateerde data
TRUNCATE chat_messages, thread_members, threads CASCADE;
TRUNCATE cool_cell_reservations, cool_cells CASCADE;
TRUNCATE facility_day_blocks CASCADE;
TRUNCATE invoice_items, invoice_actions, invoices CASCADE;
TRUNCATE claim_actions, claims CASCADE;
TRUNCATE document_comments, documents CASCADE;
TRUNCATE kanban_tasks CASCADE;
TRUNCATE fd_reviews, dossier_events CASCADE;
TRUNCATE feedback_tokens, qr_tokens CASCADE;
TRUNCATE dossier_communication_preferences, dossiers CASCADE;
TRUNCATE catalog_items, invitation_links CASCADE;
TRUNCATE integration_refs, organization_onboarding CASCADE;

-- Verwijder user_roles met organization_id
DELETE FROM user_roles WHERE organization_id IS NOT NULL;

-- Verwijder alle organisaties
DELETE FROM organizations;

-- Herstel de originele trigger function
CREATE OR REPLACE FUNCTION public.prevent_last_admin_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Only check if deleting an org_admin
  IF OLD.role = 'org_admin' THEN
    -- Count remaining org_admins for this organization
    SELECT COUNT(*) INTO admin_count
    FROM user_roles
    WHERE organization_id = OLD.organization_id
      AND role = 'org_admin'
      AND user_id != OLD.user_id;
    
    -- Prevent deletion if this is the last admin
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last org_admin. Please assign another user as org_admin first.';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;
