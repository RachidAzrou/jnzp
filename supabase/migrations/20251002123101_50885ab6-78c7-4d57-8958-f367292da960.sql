-- Create enums for wasplaats domain
CREATE TYPE cool_cell_status AS ENUM ('FREE', 'RESERVED', 'OCCUPIED', 'OUT_OF_SERVICE');
CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE wash_status AS ENUM ('PENDING', 'SCHEDULED', 'ARRIVED', 'WASHING', 'WASHED', 'RELEASED');
CREATE TYPE invoice_status AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

-- Cool cells table
CREATE TABLE cool_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  status cool_cell_status NOT NULL DEFAULT 'FREE',
  out_of_service_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cool cell reservations table
CREATE TABLE cool_cell_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE NOT NULL,
  facility_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  cool_cell_id UUID REFERENCES cool_cells(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status reservation_status NOT NULL DEFAULT 'PENDING',
  created_by_user_id UUID REFERENCES auth.users(id) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_reservation_duration CHECK (end_at > start_at)
);

-- Facility day blocks table
CREATE TABLE facility_day_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  created_by_user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wash services table
CREATE TABLE wash_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE NOT NULL,
  facility_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMPTZ,
  cool_cell_id UUID REFERENCES cool_cells(id) ON DELETE SET NULL,
  status wash_status NOT NULL DEFAULT 'PENDING',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- QR tags table
CREATE TABLE qr_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE NOT NULL,
  facility_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  qr_code_data TEXT NOT NULL,
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE NOT NULL,
  fd_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  status invoice_status NOT NULL DEFAULT 'DRAFT',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoice items table
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  qty DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE cool_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE cool_cell_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_day_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cool_cells
CREATE POLICY "Wasplaats users can view cool cells"
ON cool_cells FOR SELECT
USING (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can insert cool cells"
ON cool_cells FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can update cool cells"
ON cool_cells FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can delete cool cells"
ON cool_cells FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

-- RLS Policies for cool_cell_reservations
CREATE POLICY "Users can view reservations"
ON cool_cell_reservations FOR SELECT
USING (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can insert reservations"
ON cool_cell_reservations FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can update reservations"
ON cool_cell_reservations FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can delete reservations"
ON cool_cell_reservations FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

-- RLS Policies for facility_day_blocks
CREATE POLICY "Wasplaats users can view day blocks"
ON facility_day_blocks FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can insert day blocks"
ON facility_day_blocks FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can update day blocks"
ON facility_day_blocks FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can delete day blocks"
ON facility_day_blocks FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

-- RLS Policies for wash_services
CREATE POLICY "Users can view wash services"
ON wash_services FOR SELECT
USING (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can insert wash services"
ON wash_services FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can update wash services"
ON wash_services FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can delete wash services"
ON wash_services FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

-- RLS Policies for qr_tags
CREATE POLICY "Wasplaats users can view QR tags"
ON qr_tags FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can insert QR tags"
ON qr_tags FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can update QR tags"
ON qr_tags FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can delete QR tags"
ON qr_tags FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices"
ON invoices FOR SELECT
USING (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can insert invoices"
ON invoices FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can update invoices"
ON invoices FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can delete invoices"
ON invoices FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

-- RLS Policies for invoice_items
CREATE POLICY "Users can view invoice items"
ON invoice_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'))
  )
);

CREATE POLICY "Wasplaats users can insert invoice items"
ON invoice_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can update invoice items"
ON invoice_items FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

CREATE POLICY "Wasplaats users can delete invoice items"
ON invoice_items FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'wasplaats'));

-- Triggers for updated_at
CREATE TRIGGER update_cool_cells_updated_at
BEFORE UPDATE ON cool_cells
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cool_cell_reservations_updated_at
BEFORE UPDATE ON cool_cell_reservations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wash_services_updated_at
BEFORE UPDATE ON wash_services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();