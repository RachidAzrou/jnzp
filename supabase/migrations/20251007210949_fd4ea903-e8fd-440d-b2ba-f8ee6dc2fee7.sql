-- Create table for flight planning attachments
CREATE TABLE IF NOT EXISTS public.flight_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repatriation_id UUID NOT NULL REFERENCES public.repatriations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.flight_attachments ENABLE ROW LEVEL SECURITY;

-- FD can view attachments for their dossiers
CREATE POLICY "FD can view flight attachments"
ON public.flight_attachments
FOR SELECT
USING (
  has_role(auth.uid(), 'funeral_director'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- FD can insert attachments
CREATE POLICY "FD can insert flight attachments"
ON public.flight_attachments
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'funeral_director'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND uploaded_by = auth.uid()
);

-- FD can delete their own attachments
CREATE POLICY "FD can delete flight attachments"
ON public.flight_attachments
FOR DELETE
USING (
  (has_role(auth.uid(), 'funeral_director'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND uploaded_by = auth.uid()
);

-- Create storage bucket for flight attachments if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('flight-attachments', 'flight-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for flight attachments
CREATE POLICY "FD can upload flight attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'flight-attachments' AND
  (has_role(auth.uid(), 'funeral_director'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "FD can view flight attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'flight-attachments' AND
  (has_role(auth.uid(), 'funeral_director'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "FD can delete flight attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'flight-attachments' AND
  (has_role(auth.uid(), 'funeral_director'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);