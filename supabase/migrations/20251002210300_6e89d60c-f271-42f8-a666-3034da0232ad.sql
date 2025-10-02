-- Extend invoice_status enum with new statuses
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'NEEDS_INFO';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'APPROVED';

-- Create catalog_items table for service/goods catalog
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('SERVICE', 'GOOD')),
  unit TEXT NOT NULL DEFAULT 'stuk',
  default_price NUMERIC(10,2) NOT NULL,
  default_vat_rate NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- Enable RLS on catalog_items
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

-- Catalog items policies
CREATE POLICY "Organizations can view their catalog items"
  ON public.catalog_items FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organizations can manage their catalog items"
  ON public.catalog_items FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'wasplaats', 'funeral_director')
    )
  );

-- Add invoice_number to invoices table
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS needs_info_reason TEXT,
  ADD COLUMN IF NOT EXISTS insurer_notes TEXT;

-- Create invoice_actions table for audit trail
CREATE TABLE IF NOT EXISTS public.invoice_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('CREATED', 'ISSUED', 'APPROVED', 'NEEDS_INFO', 'PAID', 'CANCELLED')),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on invoice_actions
ALTER TABLE public.invoice_actions ENABLE ROW LEVEL SECURITY;

-- Invoice actions policies
CREATE POLICY "Users can view invoice actions"
  ON public.invoice_actions FOR SELECT
  USING (
    has_role(auth.uid(), 'funeral_director') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'insurer') OR 
    has_role(auth.uid(), 'wasplaats')
  );

CREATE POLICY "Users can insert invoice actions"
  ON public.invoice_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  year TEXT;
  seq_num INTEGER;
BEGIN
  -- Get the organization ID (facility_org_id for wasplaats invoices)
  org_id := NEW.facility_org_id;
  
  -- Get current year
  year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get next sequence number for this org and year
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.invoices
  WHERE facility_org_id = org_id 
    AND invoice_number LIKE year || '-%'
    AND invoice_number IS NOT NULL;
  
  -- Generate invoice number: YYYY-ORGID-SEQNUM
  NEW.invoice_number := year || '-' || SUBSTRING(org_id::TEXT, 1, 8) || '-' || LPAD(seq_num::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for invoice number generation
DROP TRIGGER IF EXISTS generate_invoice_number_trigger ON public.invoices;
CREATE TRIGGER generate_invoice_number_trigger
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION public.generate_invoice_number();

-- Update existing invoices to have invoice numbers
DO $$
DECLARE
  inv RECORD;
  year TEXT;
  seq_num INTEGER := 0;
  org_id UUID;
  last_org UUID;
BEGIN
  FOR inv IN 
    SELECT id, facility_org_id, created_at 
    FROM public.invoices 
    WHERE invoice_number IS NULL
    ORDER BY facility_org_id, created_at
  LOOP
    org_id := inv.facility_org_id;
    year := EXTRACT(YEAR FROM inv.created_at)::TEXT;
    
    -- Reset counter if org changed
    IF org_id != last_org THEN
      seq_num := 1;
      last_org := org_id;
    ELSE
      seq_num := seq_num + 1;
    END IF;
    
    UPDATE public.invoices
    SET invoice_number = year || '-' || SUBSTRING(org_id::TEXT, 1, 8) || '-' || LPAD(seq_num::TEXT, 4, '0')
    WHERE id = inv.id;
  END LOOP;
END $$;

-- Seed some catalog items for wasplaats organizations
INSERT INTO public.catalog_items (organization_id, code, name, type, unit, default_price, default_vat_rate)
SELECT 
  o.id,
  item.code,
  item.name,
  item.type,
  item.unit,
  item.price,
  21.00
FROM public.organizations o
CROSS JOIN (
  VALUES 
    ('WASH', 'Rituele wassing', 'SERVICE', 'stuk', 250.00),
    ('KAFAN', 'Lijkwade', 'GOOD', 'stuk', 55.00),
    ('COOL_DAY', 'Koelcel per dag', 'SERVICE', 'dag', 50.00),
    ('CASK_STD', 'Kist standaard', 'GOOD', 'stuk', 450.00),
    ('CASK_AIR', 'Kist luchtvaart', 'GOOD', 'stuk', 680.00),
    ('AIRTRAY', 'Airtray', 'GOOD', 'stuk', 120.00),
    ('TRANSPORT', 'Vervoer per km', 'SERVICE', 'km', 1.20),
    ('ADMIN', 'Administratiekosten', 'SERVICE', 'stuk', 75.00)
) AS item(code, name, type, unit, price)
WHERE o.type = 'WASPLAATS'
ON CONFLICT (organization_id, code) DO NOTHING;

-- Add updated_at trigger to catalog_items
CREATE TRIGGER update_catalog_items_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();