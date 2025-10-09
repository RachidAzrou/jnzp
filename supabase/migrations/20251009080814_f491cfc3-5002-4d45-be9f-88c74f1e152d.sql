-- Ad-hoc intake & facturatie flow
-- 1. Dossiers: ad-hoc flags
ALTER TABLE dossiers
  ADD COLUMN IF NOT EXISTS is_adhoc BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS adhoc_fd_org_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS adhoc_limited_access BOOLEAN DEFAULT TRUE;

-- 2. Organizations: provisional status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_ver_status') THEN
    CREATE TYPE org_ver_status AS ENUM ('PENDING','ACTIVE','REJECTED','REVIEW_REQUIRED');
  END IF;
END$$;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS provisional BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS verification_status org_ver_status DEFAULT 'PENDING';

-- 3. RLS policies voor facturatie
-- Mortuarium: CRUD eigen mortuarium/wasplaats facturen
DROP POLICY IF EXISTS inv_mort_rw ON invoices;
CREATE POLICY inv_mort_rw ON invoices
  FOR ALL
  USING (
    facility_org_id::text = (auth.jwt()->>'org_id')
    AND invoice_type IN ('MORTUARIUM','WASPLAATS')
  )
  WITH CHECK (
    facility_org_id::text = (auth.jwt()->>'org_id')
    AND invoice_type IN ('MORTUARIUM','WASPLAATS')
  );

-- FD: leesrecht op facturen gericht aan zijn org
DROP POLICY IF EXISTS inv_fd_read ON invoices;
CREATE POLICY inv_fd_read ON invoices
  FOR SELECT
  USING (fd_org_id::text = (auth.jwt()->>'org_id'));

-- Invoice items: afgeleid van invoice (mortuarium write)
DROP POLICY IF EXISTS invi_mort_rw ON invoice_items;
CREATE POLICY invi_mort_rw ON invoice_items
  FOR ALL 
  USING (
    EXISTS(
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
        AND i.invoice_type IN ('MORTUARIUM','WASPLAATS')
        AND i.facility_org_id::text = (auth.jwt()->>'org_id')
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
        AND i.invoice_type IN ('MORTUARIUM','WASPLAATS')
        AND i.facility_org_id::text = (auth.jwt()->>'org_id')
    )
  );

-- Invoice items: FD read
DROP POLICY IF EXISTS invi_fd_read ON invoice_items;
CREATE POLICY invi_fd_read ON invoice_items
  FOR SELECT 
  USING (
    EXISTS(
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
        AND i.fd_org_id::text = (auth.jwt()->>'org_id')
    )
  );

-- 4. RPC: Factuur verzenden
CREATE OR REPLACE FUNCTION fn_invoice_send(
  p_invoice_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
BEGIN
  -- Update status naar SENT
  UPDATE invoices
  SET status = 'SENT'
  WHERE id = p_invoice_id
    AND status IN ('DRAFT', 'OVERDUE')
  RETURNING * INTO v_invoice;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factuur niet gevonden of heeft al status SENT/PAID';
  END IF;

  -- Log actie
  INSERT INTO invoice_actions(invoice_id, action, user_id, metadata)
  VALUES (
    v_invoice.id,
    'SENT',
    auth.uid(),
    jsonb_build_object('message', p_message)
  );

  -- Admin notificatie
  INSERT INTO admin_notifications(type, title, message, related_type, related_id)
  VALUES (
    'INVOICE_SENT',
    'Nieuwe mortuariumfactuur',
    COALESCE(p_message, 'Er is een nieuwe mortuariumfactuur verstuurd.'),
    'invoice',
    v_invoice.id
  );

  -- Dossier event
  IF v_invoice.dossier_id IS NOT NULL THEN
    INSERT INTO dossier_events(dossier_id, event_type, event_description, created_by, metadata)
    VALUES (
      v_invoice.dossier_id,
      'INVOICE_SENT',
      'Mortuariumfactuur verzonden',
      auth.uid(),
      jsonb_build_object(
        'invoice_id', v_invoice.id,
        'invoice_number', v_invoice.invoice_number,
        'total_amount', v_invoice.total_amount
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_invoice_send(UUID, TEXT) TO authenticated;

-- 5. RPC: Factuur betaald markeren
CREATE OR REPLACE FUNCTION fn_invoice_mark_paid(
  p_invoice_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
BEGIN
  -- Update status naar PAID
  UPDATE invoices
  SET status = 'PAID'
  WHERE id = p_invoice_id
    AND status IN ('SENT', 'OVERDUE')
  RETURNING * INTO v_invoice;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factuur niet gevonden of heeft al status PAID';
  END IF;

  -- Log actie
  INSERT INTO invoice_actions(invoice_id, action, user_id, metadata)
  VALUES (
    v_invoice.id,
    'PAID',
    auth.uid(),
    jsonb_build_object('note', p_note)
  );

  -- Dossier event
  IF v_invoice.dossier_id IS NOT NULL THEN
    INSERT INTO dossier_events(dossier_id, event_type, event_description, created_by, metadata)
    VALUES (
      v_invoice.dossier_id,
      'INVOICE_PAID',
      'Mortuariumfactuur betaald',
      auth.uid(),
      jsonb_build_object(
        'invoice_id', v_invoice.id,
        'invoice_number', v_invoice.invoice_number,
        'total_amount', v_invoice.total_amount
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_invoice_mark_paid(UUID, TEXT) TO authenticated;