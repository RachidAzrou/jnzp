-- Add channel to chat_messages
CREATE TYPE communication_channel AS ENUM ('PORTAL', 'WHATSAPP');

ALTER TABLE public.chat_messages
ADD COLUMN channel communication_channel NOT NULL DEFAULT 'PORTAL',
ADD COLUMN whatsapp_message_id TEXT,
ADD COLUMN attachment_type TEXT;

-- Create index for channel queries
CREATE INDEX idx_chat_messages_channel ON public.chat_messages(channel);

-- Update comment
COMMENT ON COLUMN public.chat_messages.channel IS 'Communication channel used (Portal or WhatsApp)';
COMMENT ON COLUMN public.chat_messages.whatsapp_message_id IS 'WhatsApp message ID for tracking';
COMMENT ON COLUMN public.chat_messages.attachment_type IS 'Type of attachment (image, document, audio)';

-- Create table to track last used channel per dossier
CREATE TABLE public.dossier_communication_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  last_channel_used communication_channel NOT NULL,
  whatsapp_phone TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dossier_id)
);

-- Enable RLS
ALTER TABLE public.dossier_communication_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Familie and FD can view communication preferences"
ON public.dossier_communication_preferences
FOR SELECT
USING (
  has_role(auth.uid(), 'family'::app_role)
  OR has_role(auth.uid(), 'funeral_director'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "System can manage communication preferences"
ON public.dossier_communication_preferences
FOR ALL
USING (true)
WITH CHECK (true);

-- Update trigger for updated_at
CREATE TRIGGER update_dossier_communication_preferences_updated_at
BEFORE UPDATE ON public.dossier_communication_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();