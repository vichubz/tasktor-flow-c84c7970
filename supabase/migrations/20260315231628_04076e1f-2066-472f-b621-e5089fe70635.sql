
-- Indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON public.tasks(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_user_position ON public.tasks(user_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON public.tasks(completed_at) WHERE is_completed = true;
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON public.time_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meeting_logs_user_date ON public.meeting_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id);

-- RPC function for batch reorder
CREATE OR REPLACE FUNCTION public.reorder_tasks(task_ids uuid[], new_positions int[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  FOR i IN 1..array_length(task_ids, 1) LOOP
    UPDATE public.tasks SET position = new_positions[i] WHERE id = task_ids[i] AND user_id = auth.uid();
  END LOOP;
END;
$$;
