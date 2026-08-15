DROP POLICY IF EXISTS dataset_items_public_all ON public.dataset_items;
DROP POLICY IF EXISTS datasets_public_all ON public.datasets;
DROP POLICY IF EXISTS saved_reports_public_all ON public.saved_reports;

REVOKE ALL ON public.dataset_items FROM anon, authenticated;
REVOKE ALL ON public.datasets FROM anon, authenticated;
REVOKE ALL ON public.saved_reports FROM anon, authenticated;

GRANT ALL ON public.dataset_items TO service_role;
GRANT ALL ON public.datasets TO service_role;
GRANT ALL ON public.saved_reports TO service_role;

ALTER TABLE public.dataset_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;