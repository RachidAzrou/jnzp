-- =========================================
-- STAP 1: Nieuwe enum voor vereenvoudigde statussen
-- =========================================
CREATE TYPE public.simple_dossier_status AS ENUM (
  'CREATED',
  'IN_PROGRESS',
  'UNDER_REVIEW',
  'COMPLETED',
  'CLOSED'
);

-- =========================================
-- STAP 2: Voeg nieuwe kolom toe aan dossiers
-- =========================================
ALTER TABLE public.dossiers
ADD COLUMN new_status public.simple_dossier_status DEFAULT 'CREATED';

-- =========================================
-- STAP 3: Migreer bestaande statussen naar nieuwe statussen
-- (Alleen statussen die echt bestaan: CREATED, INTAKE_IN_PROGRESS, DOCS_PENDING, PLANNING)
-- =========================================
UPDATE public.dossiers
SET new_status = CASE 
  WHEN status = 'CREATED' THEN 'CREATED'::simple_dossier_status
  WHEN status IN ('INTAKE_IN_PROGRESS', 'DOCS_PENDING', 'DOCS_VERIFIED', 'PLANNING', 'READY_FOR_TRANSPORT', 'IN_TRANSIT', 'APPROVED') THEN 'IN_PROGRESS'::simple_dossier_status
  ELSE 'IN_PROGRESS'::simple_dossier_status
END;

-- =========================================
-- STAP 4: Drop oude status kolom en rename nieuwe
-- =========================================
ALTER TABLE public.dossiers DROP COLUMN status CASCADE;
ALTER TABLE public.dossiers RENAME COLUMN new_status TO status;
ALTER TABLE public.dossiers ALTER COLUMN status SET NOT NULL;

-- =========================================
-- STAP 5: Poliscontrole tracking kolommen toevoegen
-- =========================================
ALTER TABLE public.dossiers
ADD COLUMN policy_verification_method TEXT CHECK (policy_verification_method IN ('API', 'MANUAL', 'PENDING', NULL)),
ADD COLUMN policy_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN policy_verified_by UUID REFERENCES auth.users(id),
ADD COLUMN policy_document_url TEXT,
ADD COLUMN policy_needs_recheck BOOLEAN DEFAULT FALSE;

-- =========================================
-- STAP 6: Update claims tabel voor handmatige verificatie
-- =========================================
ALTER TABLE public.claims
ADD COLUMN verification_method TEXT CHECK (verification_method IN ('API', 'MANUAL')) DEFAULT 'API',
ADD COLUMN manual_verification_document_url TEXT,
ADD COLUMN manual_verified_by UUID REFERENCES auth.users(id),
ADD COLUMN manual_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN api_retry_scheduled_at TIMESTAMP WITH TIME ZONE;

-- =========================================
-- STAP 7: Documentatie toevoegen
-- =========================================
COMMENT ON COLUMN public.dossiers.status IS 'Simplified status: CREATED, IN_PROGRESS, UNDER_REVIEW (API check), COMPLETED, CLOSED';
COMMENT ON COLUMN public.dossiers.policy_verification_method IS 'How policy was verified: API (automatic), MANUAL (by FD), PENDING (waiting for API)';

-- =========================================
-- STAP 8: Drop oude enum types
-- =========================================
DROP TYPE IF EXISTS public.dossier_status CASCADE;