-- Extend catalog_items type constraint to include WASPLAATS
ALTER TABLE catalog_items 
DROP CONSTRAINT IF EXISTS catalog_items_type_check;

ALTER TABLE catalog_items 
ADD CONSTRAINT catalog_items_type_check CHECK (type = ANY (ARRAY['SERVICE'::text, 'GOOD'::text, 'WASPLAATS'::text]));

-- Extend invoices table to support wasplaats invoicing
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'WASPLAATS' CHECK (invoice_type IN ('WASPLAATS', 'OTHER'));

-- Add payment terms and notes
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create invoice number generation function for wasplaats
CREATE OR REPLACE FUNCTION generate_wasplaats_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  year TEXT;
  seq_num INTEGER;
BEGIN
  -- Only process if this is a wasplaats invoice without a number
  IF NEW.invoice_number IS NOT NULL OR NEW.invoice_type != 'WASPLAATS' THEN
    RETURN NEW;
  END IF;

  -- Get the wasplaats organization ID
  org_id := NEW.facility_org_id;
  
  -- Get current year
  year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get next sequence number for this org and year
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.invoices
  WHERE facility_org_id = org_id 
    AND invoice_number LIKE 'W-' || year || '-%';
  
  -- Generate invoice number: W-YYYY-###
  NEW.invoice_number := 'W-' || year || '-' || LPAD(seq_num::TEXT, 3, '0');
  
  RETURN NEW;
END;
$$;

-- Create trigger for invoice number generation
DROP TRIGGER IF EXISTS generate_wasplaats_invoice_number_trigger ON invoices;
CREATE TRIGGER generate_wasplaats_invoice_number_trigger
BEFORE INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION generate_wasplaats_invoice_number();

-- Add default catalog items for wasplaats services
DO $$
DECLARE
  wasplaats_org_id UUID;
BEGIN
  -- Get first wasplaats organization
  SELECT id INTO wasplaats_org_id 
  FROM organizations 
  WHERE type = 'WASPLAATS' 
  LIMIT 1;
  
  -- Only insert if we found a wasplaats organization
  IF wasplaats_org_id IS NOT NULL THEN
    INSERT INTO catalog_items (code, name, type, default_price, default_vat_rate, unit, organization_id, is_active)
    VALUES 
      ('COOL_DAY', 'Koelcelgebruik per dag', 'WASPLAATS', 50.00, 21.00, 'dag', wasplaats_org_id, true),
      ('WASH', 'Rituele wassing', 'WASPLAATS', 250.00, 21.00, 'stuk', wasplaats_org_id, true),
      ('KAFAN', 'Lijkwade (kafan)', 'WASPLAATS', 100.00, 21.00, 'stuk', wasplaats_org_id, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;