-- Add external invoice support to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS external_file_url TEXT,
ADD COLUMN IF NOT EXISTS external_file_name TEXT,
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);

-- Add comment
COMMENT ON COLUMN invoices.is_external IS 'Indicates if this is an externally uploaded invoice (from third parties like mortuarium, mosque, etc.)';
COMMENT ON COLUMN invoices.external_file_url IS 'Storage URL for external invoice file';
COMMENT ON COLUMN invoices.external_file_name IS 'Original filename of external invoice';

-- Create fd_reviews table for feedback system
CREATE TABLE IF NOT EXISTS fd_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  fd_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  whatsapp_phone TEXT,
  family_name TEXT
);

-- Enable RLS
ALTER TABLE fd_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fd_reviews
CREATE POLICY "FD can view their own reviews"
  ON fd_reviews FOR SELECT
  USING (
    fd_org_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('funeral_director', 'org_admin', 'admin')
    )
  );

CREATE POLICY "Admins can view all reviews"
  ON fd_reviews FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert reviews"
  ON fd_reviews FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fd_reviews_dossier ON fd_reviews(dossier_id);
CREATE INDEX IF NOT EXISTS idx_fd_reviews_fd_org ON fd_reviews(fd_org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_is_external ON invoices(is_external);

-- Add advisory checkpoints tracking to dossiers
ALTER TABLE dossiers 
ADD COLUMN IF NOT EXISTS advisory_checks JSONB DEFAULT '{}';

COMMENT ON COLUMN dossiers.advisory_checks IS 'Tracks which advisory dialogs have been shown and confirmed by FD';
