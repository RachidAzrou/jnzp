-- Add deceased_gender field to dossiers table
ALTER TABLE public.dossiers 
ADD COLUMN deceased_gender text CHECK (deceased_gender IN ('M', 'V'));

-- Add internal_notes field to dossiers table for FD notes
ALTER TABLE public.dossiers 
ADD COLUMN internal_notes text;

-- Create document_comments table for document-specific comments
CREATE TABLE public.document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- RLS for document comments
CREATE POLICY "FD can view document comments"
ON public.document_comments FOR SELECT
USING (
  has_role(auth.uid(), 'funeral_director') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "FD can insert document comments"
ON public.document_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'admin'))
);

-- Create manual_events table for timeline
CREATE TABLE public.manual_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_title text NOT NULL,
  event_description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_events ENABLE ROW LEVEL SECURITY;

-- RLS for manual events
CREATE POLICY "FD can view manual events"
ON public.manual_events FOR SELECT
USING (
  has_role(auth.uid(), 'funeral_director') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "FD can insert manual events"
ON public.manual_events FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (has_role(auth.uid(), 'funeral_director') OR has_role(auth.uid(), 'admin'))
);