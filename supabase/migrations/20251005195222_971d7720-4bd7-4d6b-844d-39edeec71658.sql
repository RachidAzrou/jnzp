-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_event TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('EMAIL', 'WHATSAPP', 'BOTH')),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('FAMILY', 'FD', 'INSURER', 'WASPLAATS', 'MOSQUE')),
  subject TEXT,
  template_nl TEXT NOT NULL,
  template_fr TEXT,
  template_en TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification templates
CREATE POLICY "Admins can manage notification templates"
ON notification_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active notification templates"
ON notification_templates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Create notification log table
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE,
  template_id UUID REFERENCES notification_templates(id),
  recipient_type TEXT NOT NULL,
  recipient_contact TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'DELIVERED')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification log
CREATE POLICY "Users can view notification logs for their dossiers"
ON notification_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'funeral_director'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platform_admin'::app_role)
);

CREATE POLICY "System can insert notification logs"
ON notification_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add feedback tokens for anonymous feedback submission
CREATE TABLE IF NOT EXISTS feedback_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feedback_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for feedback tokens
CREATE POLICY "Anyone can view valid feedback tokens"
ON feedback_tokens
FOR SELECT
TO anon, authenticated
USING (NOT used AND expires_at > NOW());

CREATE POLICY "System can create feedback tokens"
ON feedback_tokens
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update feedback tokens"
ON feedback_tokens
FOR UPDATE
TO anon, authenticated
USING (true);

-- Function to generate feedback token
CREATE OR REPLACE FUNCTION generate_feedback_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    token := encode(gen_random_bytes(32), 'base64');
    token := replace(replace(replace(token, '/', '_'), '+', '-'), '=', '');
    SELECT EXISTS(SELECT 1 FROM feedback_tokens WHERE feedback_tokens.token = token) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN token;
END;
$$;

-- Insert default notification templates
INSERT INTO notification_templates (trigger_event, channel, recipient_type, subject, template_nl, template_fr, template_en) VALUES
('STATUS_DOCS_VERIFIED', 'BOTH', 'FAMILY', 'Documenten geverifieerd', 'Beste {family_name},\n\nDe documenten voor het dossier van {deceased_name} zijn geverifieerd. We gaan nu verder met de volgende stappen.\n\nMet vriendelijke groet,\n{fd_name}', 'Cher/Chère {family_name},\n\nLes documents pour le dossier de {deceased_name} ont été vérifiés. Nous allons maintenant poursuivre avec les prochaines étapes.\n\nCordialement,\n{fd_name}', 'Dear {family_name},\n\nThe documents for {deceased_name}''s file have been verified. We will now proceed with the next steps.\n\nKind regards,\n{fd_name}'),

('STATUS_PLANNING', 'BOTH', 'FAMILY', 'Planning gestart', 'Beste {family_name},\n\nWe zijn begonnen met de planning voor {deceased_name}. U wordt op de hoogte gehouden van de verdere stappen.\n\nMet vriendelijke groet,\n{fd_name}', 'Cher/Chère {family_name},\n\nNous avons commencé la planification pour {deceased_name}. Vous serez tenu informé des prochaines étapes.\n\nCordialement,\n{fd_name}', 'Dear {family_name},\n\nWe have started planning for {deceased_name}. You will be kept informed of further steps.\n\nKind regards,\n{fd_name}'),

('STATUS_READY_FOR_TRANSPORT', 'WHATSAPP', 'FAMILY', 'Klaar voor transport', 'Beste {family_name},\n\n{deceased_name} is klaar voor transport. We nemen binnenkort contact met u op voor de verdere details.\n\nMet vriendelijke groet,\n{fd_name}', 'Cher/Chère {family_name},\n\n{deceased_name} est prêt pour le transport. Nous vous contacterons bientôt pour plus de détails.\n\nCordialement,\n{fd_name}', 'Dear {family_name},\n\n{deceased_name} is ready for transport. We will contact you soon with further details.\n\nKind regards,\n{fd_name}'),

('STATUS_ARCHIVED', 'BOTH', 'FAMILY', 'Dossier afgesloten', 'Beste {family_name},\n\nHet dossier voor {deceased_name} is nu afgesloten. Hartelijk dank voor uw vertrouwen in onze diensten.\n\nWe sturen u binnenkort een feedbackformulier toe.\n\nMet vriendelijke groet,\n{fd_name}', 'Cher/Chère {family_name},\n\nLe dossier de {deceased_name} est maintenant clôturé. Merci beaucoup pour votre confiance en nos services.\n\nNous vous enverrons bientôt un formulaire de feedback.\n\nCordialement,\n{fd_name}', 'Dear {family_name},\n\nThe file for {deceased_name} is now closed. Thank you for your trust in our services.\n\nWe will send you a feedback form soon.\n\nKind regards,\n{fd_name}'),

('FEEDBACK_REQUEST', 'WHATSAPP', 'FAMILY', 'Uw mening telt', 'Beste {family_name},\n\nWe hopen dat we u goed hebben kunnen bijstaan tijdens deze moeilijke tijd.\n\nUw feedback helpt ons om onze dienstverlening te verbeteren. Klik op onderstaande link om uw ervaringen te delen:\n\n{feedback_url}\n\nHartelijk dank,\n{fd_name}', 'Cher/Chère {family_name},\n\nNous espérons avoir pu vous accompagner au mieux durant cette période difficile.\n\nVos commentaires nous aident à améliorer nos services. Cliquez sur le lien ci-dessous pour partager votre expérience:\n\n{feedback_url}\n\nMerci beaucoup,\n{fd_name}', 'Dear {family_name},\n\nWe hope we were able to assist you well during this difficult time.\n\nYour feedback helps us improve our services. Click the link below to share your experience:\n\n{feedback_url}\n\nThank you,\n{fd_name}');

-- Create index for performance
CREATE INDEX idx_notification_log_dossier ON notification_log(dossier_id);
CREATE INDEX idx_notification_log_status ON notification_log(status);
CREATE INDEX idx_feedback_tokens_token ON feedback_tokens(token);
CREATE INDEX idx_feedback_tokens_dossier ON feedback_tokens(dossier_id);