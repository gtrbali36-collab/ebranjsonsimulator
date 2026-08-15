CREATE TABLE public.datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL DEFAULT 'file',
  source_url text,
  tanggal text,
  total_items integer NOT NULL DEFAULT 0,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dataset_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  kategori text,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dataset_items_dataset_id_idx ON public.dataset_items(dataset_id);
CREATE INDEX dataset_items_kategori_idx ON public.dataset_items(kategori);

CREATE TABLE public.saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid REFERENCES public.datasets(id) ON DELETE SET NULL,
  name text NOT NULL,
  tanggal text,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX saved_reports_created_at_idx ON public.saved_reports(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.datasets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dataset_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_reports TO anon, authenticated;
GRANT ALL ON public.datasets TO service_role;
GRANT ALL ON public.dataset_items TO service_role;
GRANT ALL ON public.saved_reports TO service_role;

ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "datasets_public_all" ON public.datasets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "dataset_items_public_all" ON public.dataset_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "saved_reports_public_all" ON public.saved_reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);