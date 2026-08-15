ALTER TABLE public.saved_reports
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'input',
  ADD COLUMN IF NOT EXISTS analysis text,
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS saved_reports_kind_idx ON public.saved_reports (kind);