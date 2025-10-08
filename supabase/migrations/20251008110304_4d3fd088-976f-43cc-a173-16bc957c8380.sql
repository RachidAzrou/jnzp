-- 1) Ensure pg_net extension is available (for net.http_*)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) Safe helper: read app.settings without crashing if missing
CREATE OR REPLACE FUNCTION app_get_setting(key text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  -- Returns NULL instead of error if setting doesn't exist
  SELECT current_setting(key, true);
$$;

-- 3) Centralized settings table for app config (safer than GUC)
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- Seed the public Supabase URL (NO secrets!)
INSERT INTO app_settings (key, value)
VALUES ('supabase_url', 'https://yupqrawkrpyfrdzxssdk.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 4) Convenient wrapper: try table first, then GUC, then default
CREATE OR REPLACE FUNCTION app_setting(key text, default_value text DEFAULT NULL)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    (SELECT value FROM app_settings WHERE app_settings.key = app_setting.key LIMIT 1),
    current_setting('app.settings.' || app_setting.key, true),
    default_value
  );
$$;

-- Note: ALTER DATABASE commands are not allowed in migrations
-- The GUC parameter can be set manually if needed via database settings

-- Enable RLS on app_settings table
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read app settings
CREATE POLICY "Anyone can read app settings"
ON app_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify app settings
CREATE POLICY "Only admins can modify app settings"
ON app_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'admin'));