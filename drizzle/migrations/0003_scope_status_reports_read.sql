DROP POLICY IF EXISTS "Reports are public" ON public.status_reports;
CREATE POLICY "Reports readable for mapped assets" ON public.status_reports
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.assets a WHERE a.id = status_reports.asset_id));