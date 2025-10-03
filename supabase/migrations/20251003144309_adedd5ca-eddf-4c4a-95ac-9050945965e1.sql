-- Create user_status enum
CREATE TYPE user_status AS ENUM (
  'PENDING_REGISTRATION',
  'EMAIL_VERIFIED',
  'TWOFA_VERIFIED', 
  'PENDING_VERIFICATION',
  'ACTIVE',
  'DISABLED'
);

-- Add status column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'PENDING_REGISTRATION';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_fa_enabled boolean DEFAULT false;

-- Create organization verification documents table
CREATE TABLE IF NOT EXISTS organization_verification_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id)
);

ALTER TABLE organization_verification_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view verification docs"
ON organization_verification_docs FOR SELECT
USING (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Org users can upload verification docs"
ON organization_verification_docs FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid()
);

-- Add verification fields to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS requested_at timestamp with time zone DEFAULT now();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create invitation_links table for org admins to invite users
CREATE TABLE IF NOT EXISTS invitation_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  used_by uuid REFERENCES auth.users(id),
  used_at timestamp with time zone,
  max_uses integer DEFAULT 1,
  current_uses integer DEFAULT 0
);

ALTER TABLE invitation_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can create invitation links"
ON invitation_links FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('org_admin', 'admin', 'platform_admin')
  )
);

CREATE POLICY "Org admins can view their invitation links"
ON invitation_links FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  ) OR has_role(auth.uid(), 'platform_admin')
);

CREATE POLICY "Anyone can view valid invitation links by code"
ON invitation_links FOR SELECT
USING (
  expires_at > now() AND 
  (max_uses IS NULL OR current_uses < max_uses)
);

-- Function to generate unique invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    code := substr(md5(random()::text), 1, 8);
    SELECT EXISTS(SELECT 1 FROM invitation_links WHERE invitation_links.code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$;

-- Update profiles RLS to allow self-registration
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile or during registration"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_invitation_links_code ON invitation_links(code);
CREATE INDEX IF NOT EXISTS idx_invitation_links_org ON invitation_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_verification_docs_org ON organization_verification_docs(organization_id);