-- Install pg_net extension (creates schema "net")
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create helper function for safe app.settings reading
CREATE OR REPLACE FUNCTION app_get_setting(key text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  -- Use 'missing_ok = true' to prevent errors if setting doesn't exist
  SELECT current_setting(key, true);
$$;

-- Note: ALTER DATABASE commands are not allowed in migrations
-- The Supabase URL is already available via environment variables
-- Test the function with: SELECT app_get_setting('app.settings.supabase_url');