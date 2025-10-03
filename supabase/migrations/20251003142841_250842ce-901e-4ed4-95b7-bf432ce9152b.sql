-- Step 2: Add role_scope and remaining tables (fixed for idempotency)

-- Add role_scope to user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS scope text DEFAULT 'ORG' CHECK (scope IN ('PLATFORM', 'ORG'));
CREATE INDEX IF NOT EXISTS idx_user_roles_scope ON user_roles(scope);

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  scope text NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'org', 'role')),
  description text,
  meta jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can manage feature flags" ON feature_flags;
CREATE POLICY "Platform admins can manage feature flags"
ON feature_flags FOR ALL
USING (has_role(auth.uid(), 'platform_admin'));

DROP POLICY IF EXISTS "All authenticated users can view feature flags" ON feature_flags;
CREATE POLICY "All authenticated users can view feature flags"
ON feature_flags FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Enhanced audit_events
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_role text;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS target_type text;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS target_id uuid;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS payload_diff jsonb;

CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_target ON audit_events(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);

DROP POLICY IF EXISTS "Platform admins can view all audit events" ON audit_events;
CREATE POLICY "Platform admins can view all audit events"
ON audit_events FOR SELECT
USING (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'admin'));

-- Organization verification
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'ACTIVE' CHECK (verification_status IN ('PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verified_by uuid;

CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(verification_status);

UPDATE organizations SET verification_status = 'ACTIVE' WHERE verification_status IS NULL;

-- Locations table
CREATE TABLE IF NOT EXISTS organization_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'Nederland',
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE organization_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view locations" ON organization_locations;
CREATE POLICY "Authenticated users can view locations"
ON organization_locations FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Platform admins can manage locations" ON organization_locations;
CREATE POLICY "Platform admins can manage locations"
ON organization_locations FOR ALL
USING (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'admin'));

-- Contacts table
CREATE TABLE IF NOT EXISTS organization_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text,
  name text,
  email text,
  phone text,
  whatsapp text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE organization_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view contacts" ON organization_contacts;
CREATE POLICY "Authenticated users can view contacts"
ON organization_contacts FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Platform admins can manage contacts" ON organization_contacts;
CREATE POLICY "Platform admins can manage contacts"
ON organization_contacts FOR ALL
USING (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'admin'));

-- Integration refs
CREATE TABLE IF NOT EXISTS integration_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('MAWAQIT', 'WHATSAPP', 'INSURER_API')),
  external_id text,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ERROR', 'INACTIVE')),
  last_sync_at timestamp with time zone,
  error_message text,
  meta jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE integration_refs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can manage integrations" ON integration_refs;
CREATE POLICY "Platform admins can manage integrations"
ON integration_refs FOR ALL
USING (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Org users can view their integrations" ON integration_refs;
CREATE POLICY "Org users can view their integrations"
ON integration_refs FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  )
);

-- Admin action logging function
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id uuid;
  v_user_role text;
BEGIN
  SELECT role::text INTO v_user_role
  FROM user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'platform_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'org_admin' THEN 3
    ELSE 4
  END
  LIMIT 1;

  INSERT INTO audit_events (
    user_id,
    actor_role,
    event_type,
    target_type,
    target_id,
    reason,
    metadata,
    description
  ) VALUES (
    auth.uid(),
    v_user_role,
    p_action,
    p_target_type,
    p_target_id,
    p_reason,
    p_metadata,
    p_action || ' on ' || p_target_type
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- Triggers (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_feature_flags_updated_at') THEN
    CREATE TRIGGER update_feature_flags_updated_at
      BEFORE UPDATE ON feature_flags
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organization_locations_updated_at') THEN
    CREATE TRIGGER update_organization_locations_updated_at
      BEFORE UPDATE ON organization_locations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organization_contacts_updated_at') THEN
    CREATE TRIGGER update_organization_contacts_updated_at
      BEFORE UPDATE ON organization_contacts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_integration_refs_updated_at') THEN
    CREATE TRIGGER update_integration_refs_updated_at
      BEFORE UPDATE ON integration_refs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;