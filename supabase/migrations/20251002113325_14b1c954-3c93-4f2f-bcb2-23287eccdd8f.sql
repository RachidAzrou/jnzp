-- Create storage bucket voor documenten
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dossier-documents', 'dossier-documents', false);

-- RLS policies voor storage
CREATE POLICY "Authenticated users can view their documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dossier-documents' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dossier-documents' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can update their documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'dossier-documents' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can delete their documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dossier-documents' AND
    auth.uid() IS NOT NULL
  );

-- Add missing RLS policies for INSERT/UPDATE/DELETE on other tables
CREATE POLICY "Funeral directors can create dossiers"
  ON public.dossiers FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'funeral_director')
  );

CREATE POLICY "Funeral directors can update dossiers"
  ON public.dossiers FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'funeral_director')
  );

CREATE POLICY "Admins can insert audit events"
  ON public.audit_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage family contacts"
  ON public.family_contacts FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage medical docs"
  ON public.medical_docs FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage polis checks"
  ON public.polis_checks FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage repatriations"
  ON public.repatriations FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage flights"
  ON public.flights FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage janaz services"
  ON public.janaz_services FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Funeral directors can update documents"
  ON public.documents FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'funeral_director')
  );