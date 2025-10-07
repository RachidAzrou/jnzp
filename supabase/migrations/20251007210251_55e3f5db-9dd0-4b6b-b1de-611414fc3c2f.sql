-- Add mosque_org_id and prayer_time columns to janaz_services
ALTER TABLE janaz_services 
ADD COLUMN IF NOT EXISTS mosque_org_id UUID REFERENCES organizations(id),
ADD COLUMN IF NOT EXISTS prayer_time TEXT;