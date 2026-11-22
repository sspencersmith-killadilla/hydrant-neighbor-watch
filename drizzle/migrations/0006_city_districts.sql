ALTER TABLE public.cities ADD COLUMN district_mode text NOT NULL DEFAULT 'named' CHECK (district_mode IN ('named','geojson'));
CREATE TABLE public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  center_lat double precision,
  center_lng double precision,
  boundary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, slug)
);
GRANT SELECT ON public.districts TO anon, authenticated;
GRANT ALL ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Districts readable for listed cities" ON public.districts FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.cities c WHERE c.id = districts.city_id));
ALTER TABLE public.assets ADD COLUMN district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL;
CREATE INDEX assets_district_idx ON public.assets(district_id);