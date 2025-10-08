-- Create case_events table for tracking service events
CREATE TABLE IF NOT EXISTS case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('MORTUARY_SERVICE', 'MOSQUE_SERVICE', 'BURIAL', 'PICKUP')),
  status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'STARTED', 'DONE', 'CANCELLED')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  location TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_case_events_dossier ON case_events(dossier_id);
CREATE INDEX IF NOT EXISTS idx_case_events_type ON case_events(event_type);
CREATE INDEX IF NOT EXISTS idx_case_events_status ON case_events(status);

-- Enable RLS
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_events
CREATE POLICY "Admins can manage all case events"
  ON case_events FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "FD can view and manage case events for their dossiers"
  ON case_events FOR ALL
  USING (
    has_role(auth.uid(), 'funeral_director') 
    AND dossier_id IN (
      SELECT id FROM dossiers 
      WHERE assigned_fd_org_id IN (
        SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Mortuarium can view and manage case events"
  ON case_events FOR ALL
  USING (has_role(auth.uid(), 'mortuarium'));

CREATE POLICY "Mosque can view and manage mosque service events"
  ON case_events FOR ALL
  USING (
    has_role(auth.uid(), 'mosque') 
    AND event_type = 'MOSQUE_SERVICE'
  );

CREATE POLICY "Family can view case events for their dossiers"
  ON case_events FOR SELECT
  USING (
    has_role(auth.uid(), 'family')
    AND dossier_id IN (
      SELECT dossier_id FROM family_contacts 
      WHERE email IN (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Update timestamp trigger
CREATE TRIGGER update_case_events_updated_at
  BEFORE UPDATE ON case_events
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_task_updated_at();