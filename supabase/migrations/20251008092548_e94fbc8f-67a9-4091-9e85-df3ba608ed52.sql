-- Add OBITUARY_JANAZAH to doc_type enum (separate transaction)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OBITUARY_JANAZAH' AND enumtypid = 'doc_type'::regtype) THEN
    ALTER TYPE doc_type ADD VALUE 'OBITUARY_JANAZAH';
  END IF;
END $$;