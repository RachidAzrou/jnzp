-- Enums voor de verschillende types
CREATE TYPE public.org_type AS ENUM ('FUNERAL_DIRECTOR', 'MOSQUE', 'INSURER', 'FAMILY', 'ADMIN', 'OTHER');

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

CREATE TYPE public.doc_type AS ENUM (
  'MEDICAL_ID',
  'MEDICAL_DEATH_CERTIFICATE',
  'DEATH_CERTIFICATE',
  'TRANSPORT_PERMIT',
  'LAISSEZ_PASSER',
  'CONSULAR_LASSEZ_PASSER',
  'SEALING_CERTIFICATE',
  'OTHER'
);

CREATE TYPE public.doc_status AS ENUM (
  'IN_REVIEW',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE public.location_type AS ENUM ('HOME', 'HOSPITAL', 'OTHER');

CREATE TYPE public.service_status AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'FAILED');

CREATE TYPE public.delivery_status AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TYPE public.channel AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- Organizations tabel
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type public.org_type NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles tabel (naast auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles tabel (RBAC)
CREATE TYPE public.app_role AS ENUM ('admin', 'funeral_director', 'insurer', 'family');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  UNIQUE (user_id, role)
);

-- Dossier tabel (centrale entiteit)
CREATE TABLE public.dossiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_number TEXT UNIQUE NOT NULL,
  status public.dossier_status NOT NULL DEFAULT 'CREATED',
  deceased_name TEXT NOT NULL,
  deceased_dob DATE,
  date_of_death DATE,
  legal_hold BOOLEAN NOT NULL DEFAULT false,
  require_doc_ref TEXT,
  assigned_fd_org_id UUID REFERENCES public.organizations(id),
  insurer_org_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Family contact
CREATE TABLE public.family_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT,
  email TEXT,
  preferred_language TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Documents tabel
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE NOT NULL,
  doc_type public.doc_type NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status public.doc_status NOT NULL DEFAULT 'IN_REVIEW',
  rejection_reason TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  reviewed_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Medical documentation
CREATE TABLE public.medical_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE NOT NULL,
  location_type public.location_type NOT NULL,
  address TEXT NOT NULL,
  floor TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Polis check
CREATE TABLE public.polis_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE NOT NULL,
  insurer_name TEXT NOT NULL,
  polis_number TEXT NOT NULL,
  is_covered BOOLEAN,
  num_travelers INTEGER,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Repatriation details
CREATE TABLE public.repatriations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE NOT NULL,
  dest_country TEXT NOT NULL,
  dest_city TEXT NOT NULL,
  dest_address TEXT,
  traveler_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Flight information
CREATE TABLE public.flights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repatriation_id UUID REFERENCES public.repatriations(id) ON DELETE CASCADE NOT NULL,
  reservation_ref TEXT NOT NULL,
  carrier TEXT NOT NULL,
  depart_at TIMESTAMP WITH TIME ZONE NOT NULL,
  arrive_at TIMESTAMP WITH TIME ZONE NOT NULL,
  air_waybill TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Janaz services (moskee/wasplaats)
CREATE TABLE public.janaz_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE NOT NULL,
  mosque_name TEXT NOT NULL,
  service_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status public.service_status NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel public.channel NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  delivery_status public.delivery_status NOT NULL DEFAULT 'PENDING',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit events
CREATE TABLE public.audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS op alle tabellen
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polis_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repatriations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.janaz_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Security definer function voor role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
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

-- RLS Policies voor profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies voor user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies voor dossiers
CREATE POLICY "Funeral directors can view their assigned dossiers"
  ON public.dossiers FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'funeral_director')
  );

CREATE POLICY "Admins can manage all dossiers"
  ON public.dossiers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies voor documents
CREATE POLICY "Users can view documents for accessible dossiers"
  ON public.documents FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'funeral_director')
  );

CREATE POLICY "Users can upload documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'funeral_director') OR
    public.has_role(auth.uid(), 'family')
  );

-- RLS Policies voor andere tabellen (unified access pattern)
CREATE POLICY "Authenticated users can view family contacts"
  ON public.family_contacts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view medical docs"
  ON public.medical_docs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view polis checks"
  ON public.polis_checks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view repatriations"
  ON public.repatriations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view flights"
  ON public.flights FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view janaz services"
  ON public.janaz_services FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view audit events"
  ON public.audit_events FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Organizations are viewable by authenticated users"
  ON public.organizations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger voor auto-update van updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dossiers_updated_at
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profile trigger: auto-create profile bij signup
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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();