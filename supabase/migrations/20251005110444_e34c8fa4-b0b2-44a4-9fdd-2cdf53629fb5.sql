-- Create new table for weekly mosque availability (per day of week)
CREATE TABLE IF NOT EXISTS public.mosque_weekly_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_org_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  fajr BOOLEAN NOT NULL DEFAULT true,
  dhuhr BOOLEAN NOT NULL DEFAULT true,
  asr BOOLEAN NOT NULL DEFAULT true,
  maghrib BOOLEAN NOT NULL DEFAULT true,
  isha BOOLEAN NOT NULL DEFAULT true,
  jumuah BOOLEAN DEFAULT NULL, -- Only for Friday (day_of_week = 5)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(mosque_org_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.mosque_weekly_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Mosque users can view their weekly availability"
ON public.mosque_weekly_availability
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'mosque'::app_role) OR
  has_role(auth.uid(), 'funeral_director'::app_role)
);

CREATE POLICY "Mosque users can manage their weekly availability"
ON public.mosque_weekly_availability
FOR ALL
USING (
  mosque_org_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('mosque', 'admin', 'org_admin')
  )
)
WITH CHECK (
  mosque_org_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('mosque', 'admin', 'org_admin')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_mosque_weekly_availability_updated_at
  BEFORE UPDATE ON public.mosque_weekly_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing data from mosque_availability to weekly pattern
-- This takes the most recent week and converts it to a weekly pattern
INSERT INTO public.mosque_weekly_availability (mosque_org_id, day_of_week, fajr, dhuhr, asr, maghrib, isha, jumuah)
SELECT DISTINCT ON (mosque_org_id, EXTRACT(DOW FROM date)::INTEGER)
  mosque_org_id,
  EXTRACT(DOW FROM date)::INTEGER as day_of_week,
  fajr,
  dhuhr,
  asr,
  maghrib,
  isha,
  jumuah
FROM public.mosque_availability
ORDER BY mosque_org_id, EXTRACT(DOW FROM date)::INTEGER, date DESC
ON CONFLICT (mosque_org_id, day_of_week) DO NOTHING;