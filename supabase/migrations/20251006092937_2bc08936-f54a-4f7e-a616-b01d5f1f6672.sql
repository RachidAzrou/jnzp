-- Create view for FD review summary (fixed syntax)
CREATE OR REPLACE VIEW v_fd_review_summary AS
SELECT 
  fd_org_id,
  ROUND(AVG(rating)::numeric, 1) AS avg_rating,
  COUNT(*) AS total_reviews,
  (
    SELECT comment 
    FROM fd_reviews r2 
    WHERE r2.fd_org_id = r1.fd_org_id 
      AND comment IS NOT NULL 
    ORDER BY created_at DESC 
    LIMIT 1
  ) AS last_comment
FROM fd_reviews r1
GROUP BY fd_org_id;

-- Add external invoices support
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS external_file_url TEXT,
ADD COLUMN IF NOT EXISTS external_file_name TEXT,
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);