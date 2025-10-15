-- Add missing legal_hold_reason column to dossiers table
ALTER TABLE dossiers 
ADD COLUMN IF NOT EXISTS legal_hold_reason text;