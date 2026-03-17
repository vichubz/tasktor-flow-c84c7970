ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Set initial positions based on created_at order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS pos
  FROM public.projects
)
UPDATE public.projects SET position = ranked.pos FROM ranked WHERE projects.id = ranked.id;

-- Create reorder function for projects
CREATE OR REPLACE FUNCTION public.reorder_projects(project_ids uuid[], new_positions integer[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  FOR i IN 1..array_length(project_ids, 1) LOOP
    UPDATE public.projects SET position = new_positions[i] WHERE id = project_ids[i] AND user_id = auth.uid();
  END LOOP;
END;
$$;