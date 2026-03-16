
CREATE TABLE public.meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client TEXT,
  meeting_date DATE,
  participants TEXT,
  objective TEXT,
  transcription TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries" ON public.meeting_summaries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own summaries" ON public.meeting_summaries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own summaries" ON public.meeting_summaries FOR DELETE TO authenticated USING (auth.uid() = user_id);
