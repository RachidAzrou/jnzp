
-- Voeg ontbrekende organisation types toe aan enum
ALTER TYPE org_type ADD VALUE IF NOT EXISTS 'WASPLAATS';
