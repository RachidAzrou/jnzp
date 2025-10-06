-- 1) Add approval metadata to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

-- 2) Create admin function to approve/reject organizations
CREATE OR REPLACE FUNCTION admin_approve_organization(
  p_org_id uuid,
  p_admin_id uuid,
  p_approved boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_approved THEN
    UPDATE organizations
    SET verification_status = 'ACTIVE',
        approved_at = now(),
        approved_by = p_admin_id
    WHERE id = p_org_id;
  ELSE
    UPDATE organizations
    SET verification_status = 'REJECTED',
        approved_at = now(),
        approved_by = p_admin_id
    WHERE id = p_org_id;
  END IF;
END;
$$;

-- 3) Helper function to check if user's organization is approved
CREATE OR REPLACE FUNCTION user_org_is_approved(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN organizations o ON o.id = ur.organization_id
    WHERE ur.user_id = p_user_id
      AND o.verification_status = 'ACTIVE'
  )
$$;

-- 4) Update RLS policies for all business tables to require approved organization

-- Dossiers: alleen toegang als org approved
DROP POLICY IF EXISTS "FD can view own organization dossiers" ON dossiers;
CREATE POLICY "FD can view own organization dossiers" 
ON dossiers FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (
    has_role(auth.uid(), 'funeral_director'::app_role) AND 
    user_org_is_approved(auth.uid()) AND
    assigned_fd_org_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  ) OR 
  (has_role(auth.uid(), 'wasplaats'::app_role) AND user_org_is_approved(auth.uid()))
);

DROP POLICY IF EXISTS "FD can create dossiers for own organization" ON dossiers;
CREATE POLICY "FD can create dossiers for own organization"
ON dossiers FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    has_role(auth.uid(), 'funeral_director'::app_role) AND
    user_org_is_approved(auth.uid()) AND
    assigned_fd_org_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  ) OR
  (has_role(auth.uid(), 'wasplaats'::app_role) AND user_org_is_approved(auth.uid()))
);

DROP POLICY IF EXISTS "FD can update own organization dossiers" ON dossiers;
CREATE POLICY "FD can update own organization dossiers"
ON dossiers FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    has_role(auth.uid(), 'funeral_director'::app_role) AND
    user_org_is_approved(auth.uid()) AND
    assigned_fd_org_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  ) OR
  (has_role(auth.uid(), 'wasplaats'::app_role) AND user_org_is_approved(auth.uid()))
);

-- Documents: require approved org
DROP POLICY IF EXISTS "Users can view documents for accessible dossiers" ON documents;
CREATE POLICY "Users can view documents for accessible dossiers"
ON documents FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    (has_role(auth.uid(), 'funeral_director'::app_role) OR has_role(auth.uid(), 'family'::app_role)) AND
    user_org_is_approved(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can upload documents" ON documents;
CREATE POLICY "Users can upload documents"
ON documents FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    (has_role(auth.uid(), 'funeral_director'::app_role) OR has_role(auth.uid(), 'family'::app_role)) AND
    user_org_is_approved(auth.uid())
  )
);

-- Invoices: require approved org
DROP POLICY IF EXISTS "Users can view invoices" ON invoices;
CREATE POLICY "Users can view invoices"
ON invoices FOR SELECT
USING (
  (has_role(auth.uid(), 'funeral_director'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'wasplaats'::app_role))
  AND user_org_is_approved(auth.uid())
);

DROP POLICY IF EXISTS "Wasplaats users can insert invoices" ON invoices;
CREATE POLICY "Wasplaats users can insert invoices"
ON invoices FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'wasplaats'::app_role))
  AND user_org_is_approved(auth.uid())
);

DROP POLICY IF EXISTS "Wasplaats users can update invoices" ON invoices;
CREATE POLICY "Wasplaats users can update invoices"
ON invoices FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'wasplaats'::app_role))
  AND user_org_is_approved(auth.uid())
);

-- Cool cells: require approved org
DROP POLICY IF EXISTS "Wasplaats users can view cool cells" ON cool_cells;
CREATE POLICY "Wasplaats users can view cool cells"
ON cool_cells FOR SELECT
USING (
  (has_role(auth.uid(), 'funeral_director'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'wasplaats'::app_role))
  AND user_org_is_approved(auth.uid())
);

DROP POLICY IF EXISTS "Wasplaats users can insert cool cells" ON cool_cells;
CREATE POLICY "Wasplaats users can insert cool cells"
ON cool_cells FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'wasplaats'::app_role))
  AND user_org_is_approved(auth.uid())
);

-- Cool cell reservations: require approved org
DROP POLICY IF EXISTS "Users can view reservations" ON cool_cell_reservations;
CREATE POLICY "Users can view reservations"
ON cool_cell_reservations FOR SELECT
USING (
  (has_role(auth.uid(), 'funeral_director'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'wasplaats'::app_role))
  AND user_org_is_approved(auth.uid())
);

DROP POLICY IF EXISTS "Wasplaats users can insert reservations" ON cool_cell_reservations;
CREATE POLICY "Wasplaats users can insert reservations"
ON cool_cell_reservations FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'wasplaats'::app_role))
  AND user_org_is_approved(auth.uid())
);

-- Kanban tasks: require approved org
DROP POLICY IF EXISTS "Org members can view org tasks" ON kanban_tasks;
CREATE POLICY "Org members can view org tasks"
ON kanban_tasks FOR SELECT
USING (
  user_org_is_approved(auth.uid()) AND
  org_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Org members can create tasks" ON kanban_tasks;
CREATE POLICY "Org members can create tasks"
ON kanban_tasks FOR INSERT
WITH CHECK (
  user_org_is_approved(auth.uid()) AND
  org_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Org members can update org tasks" ON kanban_tasks;
CREATE POLICY "Org members can update org tasks"
ON kanban_tasks FOR UPDATE
USING (
  user_org_is_approved(auth.uid()) AND
  org_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
);

-- Catalog items: require approved org
DROP POLICY IF EXISTS "Organizations can view their catalog items" ON catalog_items;
CREATE POLICY "Organizations can view their catalog items"
ON catalog_items FOR SELECT
USING (
  user_org_is_approved(auth.uid()) AND
  organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Organizations can manage their catalog items" ON catalog_items;
CREATE POLICY "Organizations can manage their catalog items"
ON catalog_items FOR ALL
USING (
  user_org_is_approved(auth.uid()) AND
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'wasplaats', 'funeral_director')
  )
);