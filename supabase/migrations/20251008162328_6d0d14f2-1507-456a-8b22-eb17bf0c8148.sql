-- Add deceased name columns for split first/last name support
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS deceased_first_name text,
  ADD COLUMN IF NOT EXISTS deceased_last_name text;

-- Backfill existing rows from deceased_name (simple split)
UPDATE public.dossiers
SET deceased_first_name = NULLIF(split_part(deceased_name, ' ', 1), ''),
    deceased_last_name  = NULLIF(btrim(substring(deceased_name from position(' ' in deceased_name)+1)), '')
WHERE (deceased_first_name IS NULL AND deceased_last_name IS NULL)
  AND deceased_name IS NOT NULL
  AND deceased_name <> '';

-- Bidirectional sync function: keep deceased_name and parts in sync
CREATE OR REPLACE FUNCTION public.tg_sync_deceased_name_parts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If first/last name are set, update combined name
  IF (NEW.deceased_first_name IS NOT NULL OR NEW.deceased_last_name IS NOT NULL) THEN
    NEW.deceased_name := btrim(coalesce(NEW.deceased_first_name,'') || ' ' || coalesce(NEW.deceased_last_name,''));
  ELSIF (NEW.deceased_name IS NOT NULL AND (NEW.deceased_first_name IS NULL AND NEW.deceased_last_name IS NULL)) THEN
    -- Otherwise: parse deceased_name into parts (fallback)
    NEW.deceased_first_name := NULLIF(split_part(NEW.deceased_name, ' ', 1), '');
    NEW.deceased_last_name  := NULLIF(btrim(substring(NEW.deceased_name from position(' ' in NEW.deceased_name)+1)), '');
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for automatic sync on INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_sync_deceased_name_parts ON public.dossiers;
CREATE TRIGGER trg_sync_deceased_name_parts
BEFORE INSERT OR UPDATE ON public.dossiers
FOR EACH ROW
EXECUTE FUNCTION public.tg_sync_deceased_name_parts();

-- Index for searching by last name
CREATE INDEX IF NOT EXISTS ix_dossiers_deceased_last_name ON public.dossiers (lower(deceased_last_name));

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';