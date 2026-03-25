CREATE TABLE public.task_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their task links" ON public.task_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = task_links.task_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = task_links.task_id AND t.user_id = auth.uid()
    )
  );