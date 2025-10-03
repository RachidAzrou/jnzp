-- RBAC Epic: Complete implementation

-- 1. Add 2FA enforcement check function
CREATE OR REPLACE FUNCTION public.check_2fa_requirement(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requires_2fa BOOLEAN := FALSE;
BEGIN
  -- Check if user has any professional role that requires 2FA
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = p_user_id
      AND role IN ('funeral_director', 'org_admin', 'admin', 'platform_admin', 'wasplaats', 'mosque', 'insurer')
  ) INTO v_requires_2fa;
  
  RETURN v_requires_2fa;
END;
$$;

-- 2. Invitation acceptance with audit logging
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_code TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_org_id UUID;
  v_role app_role;
BEGIN
  -- Get and validate invitation
  SELECT * INTO v_invitation
  FROM invitation_links
  WHERE code = p_code
    AND expires_at > NOW()
    AND (max_uses IS NULL OR current_uses < max_uses);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation code'
    );
  END IF;
  
  v_org_id := v_invitation.organization_id;
  v_role := v_invitation.role;
  
  -- Add user to organization with role
  INSERT INTO user_roles (user_id, organization_id, role)
  VALUES (p_user_id, v_org_id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update invitation usage
  UPDATE invitation_links
  SET current_uses = current_uses + 1,
      used_by = p_user_id,
      used_at = NOW()
  WHERE id = v_invitation.id;
  
  -- Audit log
  INSERT INTO audit_events (
    user_id,
    event_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    p_user_id,
    'INVITATION_ACCEPTED',
    'UserRole',
    v_org_id,
    'User accepted invitation',
    jsonb_build_object(
      'role', v_role,
      'invitation_code', p_code
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'role', v_role
  );
END;
$$;

-- 3. Function to handle new organization registration (first user = org_admin)
CREATE OR REPLACE FUNCTION public.handle_new_org_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Automatically create org_admin role for the requesting user
  IF NEW.requested_by IS NOT NULL THEN
    INSERT INTO user_roles (user_id, organization_id, role)
    VALUES (NEW.requested_by, NEW.id, 'org_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Audit log
    INSERT INTO audit_events (
      user_id,
      event_type,
      target_type,
      target_id,
      description,
      metadata
    ) VALUES (
      NEW.requested_by,
      'ORG_ADMIN_AUTO_ASSIGNED',
      'Organization',
      NEW.id,
      'First user automatically assigned as org_admin',
      jsonb_build_object(
        'org_name', NEW.name,
        'org_type', NEW.type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new organizations
DROP TRIGGER IF EXISTS on_organization_created ON organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_org_registration();

-- 4. Audit logging for role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_events (
      user_id,
      event_type,
      target_type,
      target_id,
      description,
      metadata
    ) VALUES (
      NEW.user_id,
      'ROLE_ASSIGNED',
      'UserRole',
      NEW.user_id,
      'Role assigned to user',
      jsonb_build_object(
        'role', NEW.role,
        'organization_id', NEW.organization_id
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_events (
      user_id,
      event_type,
      target_type,
      target_id,
      description,
      metadata,
      payload_diff
    ) VALUES (
      NEW.user_id,
      'ROLE_CHANGED',
      'UserRole',
      NEW.user_id,
      'User role changed',
      jsonb_build_object(
        'organization_id', NEW.organization_id
      ),
      jsonb_build_object(
        'from_role', OLD.role,
        'to_role', NEW.role
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_events (
      user_id,
      event_type,
      target_type,
      target_id,
      description,
      metadata
    ) VALUES (
      OLD.user_id,
      'ROLE_REMOVED',
      'UserRole',
      OLD.user_id,
      'Role removed from user',
      jsonb_build_object(
        'role', OLD.role,
        'organization_id', OLD.organization_id
      )
    );
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for role audit logging
DROP TRIGGER IF EXISTS audit_user_role_changes ON user_roles;
CREATE TRIGGER audit_user_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION audit_role_changes();

-- 5. Function to check if user has completed 2FA setup (if required)
CREATE OR REPLACE FUNCTION public.user_2fa_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requires_2fa BOOLEAN;
  v_has_2fa BOOLEAN;
BEGIN
  -- Check if 2FA is required
  v_requires_2fa := check_2fa_requirement(p_user_id);
  
  -- Check if 2FA is enabled
  SELECT totp_enabled INTO v_has_2fa
  FROM user_2fa_settings
  WHERE user_id = p_user_id;
  
  v_has_2fa := COALESCE(v_has_2fa, false);
  
  RETURN jsonb_build_object(
    'requires_2fa', v_requires_2fa,
    'has_2fa_enabled', v_has_2fa,
    'must_setup_2fa', v_requires_2fa AND NOT v_has_2fa
  );
END;
$$;