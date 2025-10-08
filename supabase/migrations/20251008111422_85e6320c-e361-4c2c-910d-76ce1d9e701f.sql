-- Allow users to delete tasks they created (reporter_id matches current user)
-- This allows deleting manually created ad-hoc tasks

CREATE POLICY "Users can delete own created tasks"
  ON public.kanban_tasks FOR DELETE
  USING (
    reporter_id = auth.uid()
  );