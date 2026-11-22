DROP POLICY IF EXISTS "Assets are public" ON public.assets;
CREATE POLICY "Assets readable for listed cities" ON public.assets FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.cities c WHERE c.id = assets.city_id));

DROP POLICY IF EXISTS "Storm events are public" ON public.storm_events;
CREATE POLICY "Storm events readable for listed cities" ON public.storm_events FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.cities c WHERE c.id = storm_events.city_id));

DROP POLICY IF EXISTS "Teams are public" ON public.teams;
CREATE POLICY "Teams readable for listed cities" ON public.teams FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.cities c WHERE c.id = teams.city_id));

DROP POLICY IF EXISTS "Cities are public" ON public.cities;
CREATE POLICY "Cities with a valid slug are readable" ON public.cities FOR SELECT TO anon, authenticated
USING (slug ~ '^[a-z0-9-]+$');

DROP POLICY IF EXISTS "Settings are public" ON public.app_settings;
CREATE POLICY "Global settings row is readable" ON public.app_settings FOR SELECT TO anon, authenticated
USING (id = 1);