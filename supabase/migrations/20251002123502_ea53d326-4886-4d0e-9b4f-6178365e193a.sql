-- Create enums for mosque domain
CREATE TYPE mosque_status AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');

-- Mosque services table (janāza-gebed requests)
CREATE TABLE mosque_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE NOT NULL,
  mosque_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  requested_slot TIMESTAMPTZ,
  confirmed_slot TIMESTAMPTZ,
  status mosque_status NOT NULL DEFAULT 'PENDING',
  decline_reason TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mosque availability table (dagdelen)
CREATE TABLE mosque_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  morning_open BOOLEAN NOT NULL DEFAULT true,
  afternoon_open BOOLEAN NOT NULL DEFAULT true,
  evening_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mosque_org_id, date)
);

-- Mosque day blocks table
CREATE TABLE mosque_day_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  created_by_user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE mosque_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE mosque_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE mosque_day_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mosque_services
CREATE POLICY "Funeral directors can view mosque services"
ON mosque_services FOR SELECT
USING (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Funeral directors can create mosque services"
ON mosque_services FOR INSERT
WITH CHECK (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Mosque users can view their services"
ON mosque_services FOR SELECT
USING (has_role(auth.uid(), 'mosque') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Mosque users can update their services"
ON mosque_services FOR UPDATE
USING (has_role(auth.uid(), 'mosque') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for mosque_availability
CREATE POLICY "Users can view mosque availability"
ON mosque_availability FOR SELECT
USING (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'mosque') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Mosque users can manage availability"
ON mosque_availability FOR INSERT
WITH CHECK (has_role(auth.uid(), 'mosque') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Mosque users can update availability"
ON mosque_availability FOR UPDATE
USING (has_role(auth.uid(), 'mosque') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Mosque users can delete availability"
ON mosque_availability FOR DELETE
USING (has_role(auth.uid(), 'mosque') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for mosque_day_blocks
CREATE POLICY "Users can view mosque day blocks"
ON mosque_day_blocks FOR SELECT
USING (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'mosque') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Mosque users can manage day blocks"
ON mosque_day_blocks FOR INSERT
WITH CHECK (has_role(auth.uid(), 'mosque') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Mosque users can update day blocks"
ON mosque_day_blocks FOR UPDATE
USING (has_role(auth.uid(), 'mosque') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Mosque users can delete day blocks"
ON mosque_day_blocks FOR DELETE
USING (has_role(auth.uid(), 'mosque') OR has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_mosque_services_updated_at
BEFORE UPDATE ON mosque_services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mosque_availability_updated_at
BEFORE UPDATE ON mosque_availability
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();