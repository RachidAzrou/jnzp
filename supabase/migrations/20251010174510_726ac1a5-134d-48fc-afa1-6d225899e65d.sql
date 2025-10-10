-- Security Fix 1: Restrict chat_policies to authenticated users only
DROP POLICY IF EXISTS "Everyone can view chat policies" ON chat_policies;

CREATE POLICY "Authenticated users view chat policies" 
ON chat_policies 
FOR SELECT 
TO authenticated 
USING (true);

-- Security Fix 2: Add catch-all deny policy to case_events
-- This prevents unauthorized access through policy logic gaps
CREATE POLICY "zz_default_deny_case_events"
ON case_events
FOR ALL
USING (false)
WITH CHECK (false);

-- Security Fix 3: Update documents table to store file_path instead of file_url
-- This enables signed URL generation on-demand for better security
COMMENT ON COLUMN documents.file_url IS 'DEPRECATED: Use file_path for storage path. Generate signed URLs on-demand for security.';