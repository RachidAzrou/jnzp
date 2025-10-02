-- Create chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  sender_role app_role NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_chat_messages_dossier_id ON public.chat_messages(dossier_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- RLS Policies for chat_messages
-- Familie can view messages for their dossiers
CREATE POLICY "Familie can view chat messages for their dossiers"
ON public.chat_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'family'::app_role) 
  OR has_role(auth.uid(), 'funeral_director'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'insurer'::app_role)
);

-- Familie and FD can insert messages
CREATE POLICY "Familie and FD can insert chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'family'::app_role)
  OR has_role(auth.uid(), 'funeral_director'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update trigger
CREATE TRIGGER update_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;