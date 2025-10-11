-- FIX 3: Change doc_type column from ENUM to TEXT
-- Create a new TEXT column
ALTER TABLE documents ADD COLUMN doc_type_new TEXT;

-- Copy data from old column to new
UPDATE documents SET doc_type_new = doc_type::TEXT;

-- Drop old column
ALTER TABLE documents DROP COLUMN doc_type;

-- Rename new column to original name
ALTER TABLE documents RENAME COLUMN doc_type_new TO doc_type;