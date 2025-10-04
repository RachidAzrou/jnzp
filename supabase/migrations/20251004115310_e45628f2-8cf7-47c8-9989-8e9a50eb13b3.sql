-- Create thread type enum
CREATE TYPE thread_type AS ENUM (
  'dossier_family',
  'dossier_insurer', 
  'dossier_shared',
  'org_channel',
  'dm'
);

-- Create threads table
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type thread_type NOT NULL,
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  visibility_policy JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT dossier_threads_require_dossier CHECK (
    (type IN ('dossier_family', 'dossier_insurer', 'dossier_shared') AND dossier_id IS NOT NULL) OR
    (type NOT IN ('dossier_family', 'dossier_insurer', 'dossier_shared'))
  ),
  CONSTRAINT org_threads_require_org CHECK (
    (type = 'org_channel' AND org_id IS NOT NULL) OR
    (type != 'org_channel')
  )
);

-- Create thread members table
CREATE TABLE thread_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  muted BOOLEAN DEFAULT false,
  
  UNIQUE(thread_id, user_id)
);

-- Create feature flags table for policies
CREATE TABLE IF NOT EXISTS chat_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triad_chat_enabled BOOLEAN DEFAULT false,
  cross_org_dm_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default policy
INSERT INTO chat_policies (triad_chat_enabled, cross_org_dm_enabled) 
VALUES (false, false);

-- Update chat_messages to reference threads
ALTER TABLE chat_messages ADD COLUMN thread_id UUID REFERENCES threads(id) ON DELETE CASCADE;

-- Create read receipts table
CREATE TABLE message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(message_id, user_id)
);

-- Create indexes
CREATE INDEX idx_threads_dossier ON threads(dossier_id) WHERE dossier_id IS NOT NULL;
CREATE INDEX idx_threads_org ON threads(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_threads_type ON threads(type);
CREATE INDEX idx_thread_members_user ON thread_members(user_id);
CREATE INDEX idx_thread_members_thread ON thread_members(thread_id);
CREATE INDEX idx_messages_thread ON chat_messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_read_receipts_message ON message_read_receipts(message_id);

-- Enable RLS
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for threads
CREATE POLICY "Users can view threads they are members of"
ON threads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM thread_members 
    WHERE thread_members.thread_id = threads.id 
    AND thread_members.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);

CREATE POLICY "Users can create threads"
ON threads FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND (
    has_role(auth.uid(), 'funeral_director'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'insurer'::app_role) OR
    has_role(auth.uid(), 'org_admin'::app_role)
  )
);

-- RLS Policies for thread_members
CREATE POLICY "Users can view thread members of their threads"
ON thread_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM thread_members tm
    WHERE tm.thread_id = thread_members.thread_id
    AND tm.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);

CREATE POLICY "Admins can manage thread members"
ON thread_members FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'org_admin'::app_role) OR
  has_role(auth.uid(), 'funeral_director'::app_role)
);

-- RLS Policies for chat_policies
CREATE POLICY "Everyone can view chat policies"
ON chat_policies FOR SELECT
USING (true);

CREATE POLICY "Admins can update chat policies"
ON chat_policies FOR UPDATE
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- RLS Policies for message_read_receipts
CREATE POLICY "Users can view read receipts for their messages"
ON message_read_receipts FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM chat_messages cm
    WHERE cm.id = message_read_receipts.message_id
    AND cm.sender_user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own read receipts"
ON message_read_receipts FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Update chat_messages RLS to use threads
DROP POLICY IF EXISTS "Familie and FD can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Familie can view chat messages for their dossiers" ON chat_messages;

CREATE POLICY "Users can view messages in their threads"
ON chat_messages FOR SELECT
USING (
  thread_id IS NULL OR -- Legacy messages
  EXISTS (
    SELECT 1 FROM thread_members
    WHERE thread_members.thread_id = chat_messages.thread_id
    AND thread_members.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);

CREATE POLICY "Users can insert messages in their threads"
ON chat_messages FOR INSERT
WITH CHECK (
  thread_id IS NULL OR -- Legacy
  EXISTS (
    SELECT 1 FROM thread_members
    WHERE thread_members.thread_id = chat_messages.thread_id
    AND thread_members.user_id = auth.uid()
  )
);

-- Function to auto-create dossier threads
CREATE OR REPLACE FUNCTION create_dossier_threads()
RETURNS TRIGGER AS $$
DECLARE
  family_thread_id UUID;
  insurer_thread_id UUID;
BEGIN
  -- Create family thread (Familie ⇄ FD)
  INSERT INTO threads (type, dossier_id, created_by, name)
  VALUES ('dossier_family', NEW.id, NEW.created_at, 'Familie Chat')
  RETURNING id INTO family_thread_id;
  
  -- Create insurer thread (FD ⇄ Verzekeraar) if insurer assigned
  IF NEW.insurer_org_id IS NOT NULL THEN
    INSERT INTO threads (type, dossier_id, created_by, name)
    VALUES ('dossier_insurer', NEW.id, NEW.created_at, 'Verzekeraar Chat')
    RETURNING id INTO insurer_thread_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create threads for new dossiers
CREATE TRIGGER create_dossier_threads_trigger
AFTER INSERT ON dossiers
FOR EACH ROW
EXECUTE FUNCTION create_dossier_threads();

-- Function to update thread's last_message_at
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE threads 
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_thread_last_message_trigger
AFTER INSERT ON chat_messages
FOR EACH ROW
WHEN (NEW.thread_id IS NOT NULL)
EXECUTE FUNCTION update_thread_last_message();