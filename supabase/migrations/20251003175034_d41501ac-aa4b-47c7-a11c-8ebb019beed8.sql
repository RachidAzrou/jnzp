-- Privacy & GDPR Epic

-- 1. Create data retention policy table
CREATE TABLE public.data_retention_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_type TEXT NOT NULL,
  retention_period_days INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO public.data_retention_policies (data_type, retention_period_days, description) VALUES
  ('dossiers_completed', 2555, 'Voltooide dossiers worden 7 jaar bewaard (wettelijke verplichting)'),
  ('audit_logs', 2555, 'Audit logs worden 7 jaar bewaard'),
  ('user_sessions', 90, 'Inactieve sessies worden na 90 dagen verwijderd'),
  ('login_attempts', 365, 'Login pogingen worden 1 jaar bewaard'),
  ('qr_tokens_expired', 30, 'Verlopen QR tokens worden na 30 dagen verwijderd'),
  ('captcha_verifications', 7, 'Captcha verificaties worden na 7 dagen verwijderd'),
  ('rate_limit_tracking', 1, 'Rate limit tracking wordt na 1 dag verwijderd');

-- Enable RLS
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage retention policies"
ON public.data_retention_policies
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'admin'));

-- 2. Create GDPR requests table
CREATE TABLE public.gdpr_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('DATA_ACCESS', 'DATA_EXPORT', 'DATA_DELETION', 'DATA_PORTABILITY')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  export_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Enable RLS
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own GDPR requests"
ON public.gdpr_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own GDPR requests"
ON public.gdpr_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update GDPR requests"
ON public.gdpr_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'admin'));

-- 3. Function to request data export
CREATE OR REPLACE FUNCTION public.request_data_export()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_request_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check for existing pending/processing requests
  IF EXISTS (
    SELECT 1 FROM gdpr_requests
    WHERE user_id = v_user_id
      AND request_type = 'DATA_EXPORT'
      AND status IN ('PENDING', 'PROCESSING')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Er staat al een verzoek tot data-export open'
    );
  END IF;
  
  -- Create new request
  INSERT INTO gdpr_requests (user_id, request_type)
  VALUES (v_user_id, 'DATA_EXPORT')
  RETURNING id INTO v_request_id;
  
  -- Audit log
  INSERT INTO audit_events (
    user_id,
    event_type,
    target_type,
    target_id,
    description
  ) VALUES (
    v_user_id,
    'GDPR_DATA_EXPORT_REQUESTED',
    'GDPRRequest',
    v_request_id,
    'User requested data export (GDPR)'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'message', 'Uw verzoek is ontvangen en wordt binnen 30 dagen verwerkt'
  );
END;
$$;

-- 4. Function to request data deletion
CREATE OR REPLACE FUNCTION public.request_data_deletion(
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_request_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check for existing pending/processing requests
  IF EXISTS (
    SELECT 1 FROM gdpr_requests
    WHERE user_id = v_user_id
      AND request_type = 'DATA_DELETION'
      AND status IN ('PENDING', 'PROCESSING')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Er staat al een verzoek tot verwijdering open'
    );
  END IF;
  
  -- Create new request
  INSERT INTO gdpr_requests (user_id, request_type, notes)
  VALUES (v_user_id, 'DATA_DELETION', p_reason)
  RETURNING id INTO v_request_id;
  
  -- Audit log
  INSERT INTO audit_events (
    user_id,
    event_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    v_user_id,
    'GDPR_DATA_DELETION_REQUESTED',
    'GDPRRequest',
    v_request_id,
    'User requested data deletion (right to be forgotten)',
    jsonb_build_object('reason', p_reason)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'message', 'Uw verzoek is ontvangen en wordt binnen 30 dagen verwerkt'
  );
END;
$$;

-- 5. Function to apply retention policy (run periodically)
CREATE OR REPLACE FUNCTION public.apply_retention_policies()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_policy RECORD;
  v_cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Process each active retention policy
  FOR v_policy IN 
    SELECT * FROM data_retention_policies WHERE is_active = TRUE
  LOOP
    v_cutoff_date := NOW() - (v_policy.retention_period_days || ' days')::INTERVAL;
    
    -- Apply policy based on data type
    CASE v_policy.data_type
      WHEN 'user_sessions' THEN
        DELETE FROM user_sessions WHERE created_at < v_cutoff_date AND is_active = FALSE;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        
      WHEN 'login_attempts' THEN
        DELETE FROM login_attempts WHERE created_at < v_cutoff_date;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        
      WHEN 'qr_tokens_expired' THEN
        DELETE FROM qr_tokens WHERE expires_at < v_cutoff_date;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        
      WHEN 'captcha_verifications' THEN
        DELETE FROM captcha_verifications WHERE expires_at < v_cutoff_date OR (used = TRUE AND verified_at < v_cutoff_date);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        
      WHEN 'rate_limit_tracking' THEN
        DELETE FROM rate_limit_tracking WHERE window_start < v_cutoff_date;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        
      ELSE
        CONTINUE;
    END CASE;
    
    -- Log retention policy execution
    IF v_deleted_count > 0 THEN
      INSERT INTO audit_events (
        user_id,
        event_type,
        target_type,
        description,
        metadata
      ) VALUES (
        NULL,
        'RETENTION_POLICY_APPLIED',
        'System',
        'Data retention policy applied',
        jsonb_build_object(
          'policy', v_policy.data_type,
          'deleted_count', v_deleted_count,
          'retention_days', v_policy.retention_period_days
        )
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Retention policies applied successfully'
  );
END;
$$;

-- 6. Function to get user data for export (simplified version)
CREATE OR REPLACE FUNCTION public.get_user_data_export(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data JSONB;
  v_profile JSONB;
  v_roles JSONB;
  v_audit_events JSONB;
BEGIN
  -- Check if requester is the user or admin
  IF auth.uid() != p_user_id AND NOT has_role(auth.uid(), 'platform_admin') THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;
  
  -- Get profile data
  SELECT to_jsonb(profiles.*) INTO v_profile
  FROM profiles WHERE id = p_user_id;
  
  -- Get roles
  SELECT jsonb_agg(to_jsonb(user_roles.*)) INTO v_roles
  FROM user_roles WHERE user_id = p_user_id;
  
  -- Get audit events (last 12 months)
  SELECT jsonb_agg(to_jsonb(audit_events.*)) INTO v_audit_events
  FROM audit_events 
  WHERE user_id = p_user_id 
    AND created_at > NOW() - INTERVAL '12 months'
  ORDER BY created_at DESC;
  
  -- Combine all data
  v_data := jsonb_build_object(
    'user_id', p_user_id,
    'export_date', NOW(),
    'profile', v_profile,
    'roles', COALESCE(v_roles, '[]'::jsonb),
    'audit_events', COALESCE(v_audit_events, '[]'::jsonb)
  );
  
  RETURN v_data;
END;
$$;