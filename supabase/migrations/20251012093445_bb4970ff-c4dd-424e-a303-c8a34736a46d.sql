-- Add obituary column to dossiers table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dossiers' 
    AND column_name = 'obituary'
  ) THEN
    ALTER TABLE public.dossiers ADD COLUMN obituary TEXT;
  END IF;
END $$;