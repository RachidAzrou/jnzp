-- Task Board Tables for Kanban-style task management

-- Task boards (één of meerdere per organisatie)
CREATE TABLE IF NOT EXISTS public.task_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Standaard bord',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Board columns (configureerbaar per board)
CREATE TABLE IF NOT EXISTS public.task_board_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.task_boards(id) ON DELETE CASCADE,
  key TEXT NOT NULL, -- BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE
  label TEXT NOT NULL,
  order_idx INTEGER NOT NULL,
  wip_limit INTEGER,
  is_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_board_col_key ON public.task_board_columns(board_id, key);
CREATE INDEX IF NOT EXISTS idx_board_columns_order ON public.task_board_columns(board_id, order_idx);

-- Priority enum
DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Kanban tasks (vervangt oude tasks table structuur)
CREATE TABLE IF NOT EXISTS public.kanban_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.task_boards(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.task_board_columns(id) ON DELETE RESTRICT,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'MEDIUM',
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  labels TEXT[] DEFAULT '{}',
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanban_tasks_board ON public.kanban_tasks(board_id, column_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_dossier ON public.kanban_tasks(dossier_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_assignee ON public.kanban_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_position ON public.kanban_tasks(column_id, position);

-- Task watchers (wie wil updates krijgen)
CREATE TABLE IF NOT EXISTS public.task_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.kanban_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Task comments (voor communicatie in taken)
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.kanban_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);

-- Task activities (audit log voor taakwijzigingen)
CREATE TABLE IF NOT EXISTS public.task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.kanban_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- CREATED, MOVED, UPDATED, ASSIGNED, etc.
  from_value TEXT,
  to_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_activities_task ON public.task_activities(task_id);

-- RLS Policies
ALTER TABLE public.task_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;

-- Task Boards: org members can view their org's boards
CREATE POLICY "Org members can view their boards"
  ON public.task_boards FOR SELECT
  USING (org_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can manage boards"
  ON public.task_boards FOR ALL
  USING (org_id IN (
    SELECT organization_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('org_admin', 'admin', 'platform_admin')
  ));

-- Board Columns: follow board access
CREATE POLICY "Users can view columns of their boards"
  ON public.task_board_columns FOR SELECT
  USING (board_id IN (
    SELECT id FROM public.task_boards WHERE org_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Org admins can manage columns"
  ON public.task_board_columns FOR ALL
  USING (board_id IN (
    SELECT id FROM public.task_boards WHERE org_id IN (
      SELECT organization_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('org_admin', 'admin', 'platform_admin')
    )
  ));

-- Kanban Tasks: org members can view org tasks
CREATE POLICY "Org members can view org tasks"
  ON public.kanban_tasks FOR SELECT
  USING (org_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can create tasks"
  ON public.kanban_tasks FOR INSERT
  WITH CHECK (org_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update org tasks"
  ON public.kanban_tasks FOR UPDATE
  USING (org_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can delete tasks"
  ON public.kanban_tasks FOR DELETE
  USING (org_id IN (
    SELECT organization_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('org_admin', 'admin', 'platform_admin')
  ));

-- Task Watchers
CREATE POLICY "Users can view watchers"
  ON public.task_watchers FOR SELECT
  USING (task_id IN (
    SELECT id FROM public.kanban_tasks WHERE org_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage their own watchers"
  ON public.task_watchers FOR ALL
  USING (user_id = auth.uid());

-- Task Comments
CREATE POLICY "Users can view comments"
  ON public.task_comments FOR SELECT
  USING (task_id IN (
    SELECT id FROM public.kanban_tasks WHERE org_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can create comments"
  ON public.task_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update their comments"
  ON public.task_comments FOR UPDATE
  USING (author_id = auth.uid());

-- Task Activities
CREATE POLICY "Users can view task activities"
  ON public.task_activities FOR SELECT
  USING (task_id IN (
    SELECT id FROM public.kanban_tasks WHERE org_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "System can create activities"
  ON public.task_activities FOR INSERT
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_kanban_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kanban_task_updated_at
  BEFORE UPDATE ON public.kanban_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_task_updated_at();

-- Function to log task activities
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activities (task_id, user_id, action, to_value)
    VALUES (NEW.id, auth.uid(), 'CREATED', NEW.title);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log column change (move)
    IF OLD.column_id != NEW.column_id THEN
      INSERT INTO public.task_activities (task_id, user_id, action, from_value, to_value)
      SELECT NEW.id, auth.uid(), 'MOVED', 
        (SELECT label FROM public.task_board_columns WHERE id = OLD.column_id),
        (SELECT label FROM public.task_board_columns WHERE id = NEW.column_id);
    END IF;
    
    -- Log assignee change
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      INSERT INTO public.task_activities (task_id, user_id, action, metadata)
      VALUES (NEW.id, auth.uid(), 'ASSIGNED', 
        jsonb_build_object('assignee_id', NEW.assignee_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_task_activity
  AFTER INSERT OR UPDATE ON public.kanban_tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_activity();

-- Initialize default board for existing organizations
INSERT INTO public.task_boards (org_id, name)
SELECT id, 'Standaard Takenbord'
FROM public.organizations
WHERE NOT EXISTS (
  SELECT 1 FROM public.task_boards WHERE task_boards.org_id = organizations.id
);

-- Initialize default columns for all boards
INSERT INTO public.task_board_columns (board_id, key, label, order_idx, is_done)
SELECT 
  tb.id,
  col.key,
  col.label,
  col.order_idx,
  col.is_done
FROM public.task_boards tb
CROSS JOIN (
  VALUES 
    ('BACKLOG', 'Backlog', 0, false),
    ('TODO', 'Te doen', 1, false),
    ('IN_PROGRESS', 'Bezig', 2, false),
    ('REVIEW', 'Review', 3, false),
    ('DONE', 'Gereed', 4, true)
) AS col(key, label, order_idx, is_done)
WHERE NOT EXISTS (
  SELECT 1 FROM public.task_board_columns 
  WHERE board_id = tb.id AND key = col.key
);