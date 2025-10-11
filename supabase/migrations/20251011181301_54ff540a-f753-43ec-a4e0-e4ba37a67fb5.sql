-- FIX 1: Add status column to kanban_tasks
ALTER TABLE kanban_tasks 
ADD COLUMN status TEXT DEFAULT 'TODO';

-- Add check constraint
ALTER TABLE kanban_tasks 
ADD CONSTRAINT kanban_tasks_status_check 
CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE'));

-- Update existing tasks
UPDATE kanban_tasks SET status = 'TODO' WHERE status IS NULL;