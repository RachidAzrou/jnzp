-- Add address and VAT information to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS vat_number TEXT,
ADD COLUMN IF NOT EXISTS registration_number TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Nederland';