-- ============================================
-- COMPLETE DATABASE SCHEMA EXPORT
-- Voor overstap naar eigen Supabase project
-- ============================================

-- ENUMS
CREATE TYPE public.app_role AS ENUM (
  'family',
  'funeral_director',
  'org_admin',
  'admin',
  'platform_admin',
  'wasplaats',
  'mosque',
  'insurer'
);

CREATE TYPE public.dossier_status AS ENUM (
  'CREATED',
  'INTAKE_IN_PROGRESS',
  'DOCS_PENDING',
  'FD_ASSIGNED',
  'DOCS_VERIFIED',
  'APPROVED',
  'LEGAL_HOLD',
  'PLANNING',
  'READY_FOR_TRANSPORT',
  'IN_TRANSIT',
  'ARCHIVED'
);

CREATE TYPE public.dossier_flow AS ENUM (
  'UNSET',
  'REP',
  'LOC'
);

CREATE TYPE public.doc_status AS ENUM (
  'IN_REVIEW',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE public.service_status AS ENUM (
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE public.cool_cell_status AS ENUM (
  'FREE',
  'OCCUPIED',
  'OUT_OF_SERVICE'
);

CREATE TYPE public.reservation_status AS ENUM (
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE public.invoice_status AS ENUM (
  'DRAFT',
  'ISSUED',
  'NEEDS_INFO',
  'PAID',
  'CANCELLED'
);

CREATE TYPE public.claim_status AS ENUM (
  'API_PENDING',
  'API_SUCCESS',
  'API_FAILED',
  'MANUAL_OVERRIDE'
);

CREATE TYPE public.claim_source AS ENUM (
  'API',
  'MANUAL'
);

CREATE TYPE public.communication_channel AS ENUM (
  'PORTAL',
  'WHATSAPP',
  'EMAIL'
);

CREATE TYPE public.location_type AS ENUM (
  'HOME',
  'HOSPITAL',
  'NURSING_HOME',
  'OTHER'
);

CREATE TYPE public.task_type AS ENUM (
  'INTAKE_COMPLETE',
  'DOC_REVIEW',
  'DOC_REUPLOAD_REQUEST',
  'MOSQUE_CONFIRM',
  'WASH_START',
  'FLIGHT_REGISTER',
  'LEGAL_HOLD_FOLLOW_UP'
);

CREATE TYPE public.priority AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH'
);

-- SEQUENCES
CREATE SEQUENCE public.rep_sequence START 1;
CREATE SEQUENCE public.loc_sequence START 1;

-- TABLES

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  kvk_number TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'PENDING',
  verification_notes TEXT,
  requested_by UUID,
  requested_at TIMESTAMPTZ DEFAULT now(),
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  nis_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Dossiers
CREATE TABLE public.dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_number TEXT NOT NULL,
  display_id TEXT,
  status public.dossier_status NOT NULL DEFAULT 'CREATED',
  flow public.dossier_flow NOT NULL DEFAULT 'UNSET',
  deceased_name TEXT NOT NULL,
  deceased_dob DATE,
  deceased_gender TEXT,
  date_of_death DATE,
  legal_hold BOOLEAN NOT NULL DEFAULT false,
  require_doc_ref TEXT,
  assigned_fd_org_id UUID REFERENCES public.organizations(id),
  insurer_org_id UUID REFERENCES public.organizations(id),
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status public.doc_status NOT NULL DEFAULT 'IN_REVIEW',
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT
);

-- Audit Events
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  organization_id UUID REFERENCES public.organizations(id),
  dossier_id UUID REFERENCES public.dossiers(id),
  actor_role TEXT,
  event_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  description TEXT,
  reason TEXT,
  metadata JSONB,
  payload_diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Family Contacts
CREATE TABLE public.family_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT,
  email TEXT,
  preferred_language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mosque Services
CREATE TABLE public.mosque_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  mosque_org_id UUID REFERENCES public.organizations(id),
  service_date TIMESTAMPTZ NOT NULL,
  prayer TEXT,
  status public.service_status NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wash Services
CREATE TABLE public.wash_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  facility_org_id UUID REFERENCES public.organizations(id),
  scheduled_at TIMESTAMPTZ,
  status public.service_status NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Claims
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  policy_number TEXT NOT NULL,
  insurer_org_id UUID NOT NULL REFERENCES public.organizations(id),
  status public.claim_status NOT NULL DEFAULT 'API_PENDING',
  source public.claim_source NOT NULL DEFAULT 'API',
  override_reason TEXT,
  api_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  facility_org_id UUID NOT NULL REFERENCES public.organizations(id),
  fd_org_id UUID NOT NULL REFERENCES public.organizations(id),
  invoice_type TEXT DEFAULT 'WASPLAATS',
  invoice_number TEXT,
  status public.invoice_status NOT NULL DEFAULT 'DRAFT',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  vat NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_terms_days INTEGER DEFAULT 14,
  payment_reference TEXT,
  notes TEXT,
  insurer_notes TEXT,
  needs_info_reason TEXT,
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoice Items
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  qty NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cool Cells
CREATE TABLE public.cool_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_org_id UUID NOT NULL REFERENCES public.organizations(id),
  label TEXT NOT NULL,
  status public.cool_cell_status NOT NULL DEFAULT 'FREE',
  out_of_service_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cool Cell Reservations
CREATE TABLE public.cool_cell_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  cool_cell_id UUID REFERENCES public.cool_cells(id),
  facility_org_id UUID NOT NULL REFERENCES public.organizations(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status public.reservation_status NOT NULL DEFAULT 'PENDING',
  note TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dossier Events
CREATE TABLE public.dossier_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  created_by UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Manual Events
CREATE TABLE public.manual_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Threads
CREATE TABLE public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Thread Members
CREATE TABLE public.thread_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Chat Messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  channel public.communication_channel NOT NULL DEFAULT 'PORTAL',
  whatsapp_message_id TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security & Auth Tables
CREATE TABLE public.user_2fa_settings (
  user_id UUID PRIMARY KEY,
  totp_enabled BOOLEAN NOT NULL DEFAULT false,
  totp_secret TEXT,
  recovery_codes TEXT[],
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent_hash TEXT,
  ip_prefix INET,
  risk_score INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoke_reason TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_fingerprint)
);

CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '12 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rate_limit_tracking (
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (identifier, endpoint, window_start)
);

CREATE TABLE public.qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  scopes JSONB NOT NULL DEFAULT '{}',
  max_scans INTEGER,
  scan_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoke_reason TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  rejection_reason TEXT,
  export_url TEXT,
  metadata JSONB DEFAULT '{}',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  expires_at TIMESTAMPTZ
);

CREATE TABLE public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL,
  retention_period_days INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_audit_events_dossier_org ON public.audit_events(dossier_id, organization_id);
CREATE INDEX idx_audit_events_created_at ON public.audit_events(created_at DESC);
CREATE INDEX idx_dossiers_status ON public.dossiers(status);
CREATE INDEX idx_dossiers_flow ON public.dossiers(flow);
CREATE INDEX idx_documents_dossier ON public.documents(dossier_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dossier-documents', 'dossier-documents', false)
ON CONFLICT DO NOTHING;

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mosque_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wash_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cool_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cool_cell_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dossiers_updated_at
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUTO-CREATE PROFILE ON USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- GENERATE DISPLAY ID
CREATE OR REPLACE FUNCTION public.generate_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id LIKE 'TMP-%' THEN
    IF NEW.flow = 'REP' THEN
      NEW.display_id := CONCAT('REP-', LPAD(CAST(nextval('rep_sequence') AS TEXT), 6, '0'));
    ELSIF NEW.flow = 'LOC' THEN
      NEW.display_id := CONCAT('LOC-', LPAD(CAST(nextval('loc_sequence') AS TEXT), 6, '0'));
    ELSIF NEW.flow = 'UNSET' THEN
      NEW.display_id := CONCAT('TMP-', SUBSTRING(CAST(NEW.id AS TEXT), 1, 8));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_dossier_display_id
  BEFORE INSERT OR UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.generate_display_id();

-- HELPER FUNCTION: HAS_ROLE
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- BASIC RLS POLICIES (Voeg meer toe zoals nodig)

-- Dossiers: FD and Admins can view
CREATE POLICY "FD can view dossiers"
ON public.dossiers FOR SELECT
USING (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'admin'));

-- Documents: FD and Admins can view
CREATE POLICY "FD can view documents"
ON public.documents FOR SELECT
USING (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'admin'));

-- Audit Events: Filtered by organization
CREATE POLICY "Users can view their org audit events"
ON public.audit_events FOR SELECT
USING (
  has_role(auth.uid(), 'platform_admin') 
  OR has_role(auth.uid(), 'admin')
  OR organization_id IN (
    SELECT organization_id 
    FROM user_roles 
    WHERE user_id = auth.uid()
  )
);

-- System can insert audit events
CREATE POLICY "System can insert audit events"
ON public.audit_events FOR INSERT
WITH CHECK (true);

-- NOTES:
-- 1. Voeg meer RLS policies toe op basis van je security requirements
-- 2. Configureer email auth in Supabase dashboard
-- 3. Upload edge functions handmatig
-- 4. Data migratie moet handmatig of met custom scripts
