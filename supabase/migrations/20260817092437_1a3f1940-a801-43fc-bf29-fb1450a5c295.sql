ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS data_kind text NOT NULL DEFAULT 'input';
ALTER TABLE public.saved_reports ADD COLUMN IF NOT EXISTS data_kind text NOT NULL DEFAULT 'input';