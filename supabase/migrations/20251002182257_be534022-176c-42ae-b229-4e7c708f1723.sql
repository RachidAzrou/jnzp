-- Add flow and display_id columns to dossiers (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='dossiers' AND column_name='flow') THEN
    ALTER TABLE public.dossiers 
    ADD COLUMN flow dossier_flow NOT NULL DEFAULT 'UNSET';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='dossiers' AND column_name='display_id') THEN
    ALTER TABLE public.dossiers 
    ADD COLUMN display_id TEXT;
  END IF;
END $$;

-- Create sequences for REP and LOC
CREATE SEQUENCE IF NOT EXISTS rep_sequence START WITH 1;
CREATE SEQUENCE IF NOT EXISTS loc_sequence START WITH 1;

-- Backfill display_id for existing dossiers using a CTE approach
WITH numbered_dossiers AS (
  SELECT 
    id,
    flow,
    row_number() OVER (PARTITION BY flow ORDER BY created_at) as rn
  FROM public.dossiers
)
UPDATE public.dossiers d
SET display_id = CASE
  WHEN d.flow = 'REP' THEN CONCAT('REP-', LPAD(CAST(nd.rn AS TEXT), 6, '0'))
  WHEN d.flow = 'LOC' THEN CONCAT('LOC-', LPAD(CAST(nd.rn AS TEXT), 6, '0'))
  ELSE CONCAT('TMP-', SUBSTRING(CAST(d.id AS TEXT), 1, 8))
END
FROM numbered_dossiers nd
WHERE d.id = nd.id AND d.display_id IS NULL;

-- Update sequences to start after existing records
DO $$
DECLARE
  max_rep INTEGER;
  max_loc INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 5) AS INTEGER)), 0) INTO max_rep
  FROM public.dossiers WHERE display_id LIKE 'REP-%';
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 5) AS INTEGER)), 0) INTO max_loc
  FROM public.dossiers WHERE display_id LIKE 'LOC-%';
  
  PERFORM setval('rep_sequence', max_rep + 1);
  PERFORM setval('loc_sequence', max_loc + 1);
END $$;

-- Create function to generate display_id when flow is set
CREATE OR REPLACE FUNCTION public.generate_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if display_id is null or starts with TMP-
  IF NEW.display_id IS NULL OR NEW.display_id LIKE 'TMP-%' THEN
    IF NEW.flow = 'REP' THEN
      NEW.display_id := CONCAT('REP-', LPAD(CAST(nextval('rep_sequence') AS TEXT), 6, '0'));
    ELSIF NEW.flow = 'LOC' THEN
      NEW.display_id := CONCAT('LOC-', LPAD(CAST(nextval('loc_sequence') AS TEXT), 6, '0'));
    ELSIF NEW.flow = 'UNSET' THEN
      NEW.display_id := CONCAT('TMP-', SUBSTRING(CAST(NEW.id AS TEXT), 1, 8));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS generate_display_id_trigger ON public.dossiers;

CREATE TRIGGER generate_display_id_trigger
BEFORE INSERT OR UPDATE OF flow ON public.dossiers
FOR EACH ROW
EXECUTE FUNCTION public.generate_display_id();

-- Make display_id unique and create index on flow (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ux_dossiers_display_id') THEN
    CREATE UNIQUE INDEX ux_dossiers_display_id ON public.dossiers(display_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_dossiers_flow') THEN
    CREATE INDEX ix_dossiers_flow ON public.dossiers(flow);
  END IF;
END $$;