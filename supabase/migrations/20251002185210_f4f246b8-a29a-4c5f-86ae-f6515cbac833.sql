-- Create chat messages table (safe)
DO $$
BEGIN
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
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes (drop first if exists)
DROP INDEX IF EXISTS idx_chat_messages_dossier_id CASCADE;
DROP INDEX IF EXISTS idx_chat_messages_created_at CASCADE;

CREATE INDEX idx_chat_messages_dossier_id ON public.chat_messages(dossier_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Familie can view chat messages for their dossiers" ON public.chat_messages;
DROP POLICY IF EXISTS "Familie and FD can insert chat messages" ON public.chat_messages;

-- RLS Policies for chat_messages
CREATE POLICY "Familie can view chat messages for their dossiers"
ON public.chat_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'family'::app_role) 
  OR has_role(auth.uid(), 'funeral_director'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'insurer'::app_role)
);

CREATE POLICY "Familie and FD can insert chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'family'::app_role)
  OR has_role(auth.uid(), 'funeral_director'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;

CREATE TRIGGER update_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime (safely - skip if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;