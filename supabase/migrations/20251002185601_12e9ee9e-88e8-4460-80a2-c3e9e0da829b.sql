-- Create prayer type enum
CREATE TYPE prayer_type AS ENUM ('FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA', 'JUMUAH');

-- Add prayer column to mosque_services and make requested_slot optional
ALTER TABLE public.mosque_services
ADD COLUMN prayer prayer_type,
ADD COLUMN requested_date date,
ALTER COLUMN requested_slot DROP NOT NULL,
ALTER COLUMN confirmed_slot DROP NOT NULL;

-- Update mosque_services to have reason length validation (will be enforced in app)
-- Add column for alternative proposal
ALTER TABLE public.mosque_services
ADD COLUMN proposed_date date,
ADD COLUMN proposed_prayer prayer_type;

-- Recreate mosque_availability to support per-prayer availability
DROP TABLE IF EXISTS public.mosque_availability CASCADE;

CREATE TABLE public.mosque_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mosque_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  fajr BOOLEAN NOT NULL DEFAULT true,
  dhuhr BOOLEAN NOT NULL DEFAULT true,
  asr BOOLEAN NOT NULL DEFAULT true,
  maghrib BOOLEAN NOT NULL DEFAULT true,
  isha BOOLEAN NOT NULL DEFAULT true,
  jumuah BOOLEAN DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mosque_org_id, date)
);

-- Enable RLS
ALTER TABLE public.mosque_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Mosque users can manage availability"
ON public.mosque_availability
FOR ALL
USING (has_role(auth.uid(), 'mosque'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view mosque availability"
ON public.mosque_availability
FOR SELECT
USING (has_role(auth.uid(), 'funeral_director'::app_role) OR has_role(auth.uid(), 'mosque'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update trigger
CREATE TRIGGER update_mosque_availability_updated_at
BEFORE UPDATE ON public.mosque_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update mosque_day_blocks to include created_by info (already exists, just ensure it's there)
COMMENT ON TABLE public.mosque_day_blocks IS 'Day closures due to force majeure - blocks all prayers for that day';