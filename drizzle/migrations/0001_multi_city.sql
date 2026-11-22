create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$'),
  name text not null,
  region text,
  center_lat double precision not null,
  center_lng double precision not null,
  is_demo boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.cities to anon, authenticated;
grant all on public.cities to service_role;
alter table public.cities enable row level security;
create policy "Cities are public" on public.cities for select to anon, authenticated using (true);

create table public.city_members (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (city_id, user_id, role)
);
grant select on public.city_members to authenticated;
grant all on public.city_members to service_role;
alter table public.city_members enable row level security;
create policy "Users read own memberships" on public.city_members for select to authenticated using (auth.uid() = user_id);

insert into public.cities (id, slug, name, region, center_lat, center_lng, is_demo)
values ('00000000-0000-0000-0002-000000000001', 'maple-heights-demo', 'Maple Heights (Demo)', 'Sample neighborhood', 41.5912, -93.6175, true);

alter table public.assets add column city_id uuid references public.cities(id) on delete cascade;
update public.assets set city_id = '00000000-0000-0000-0002-000000000001' where city_id is null;
alter table public.assets alter column city_id set not null;
alter table public.assets drop constraint assets_asset_code_key;
alter table public.assets add constraint assets_city_code_key unique (city_id, asset_code);
create index on public.assets(city_id);

alter table public.storm_events add column city_id uuid references public.cities(id) on delete cascade;
update public.storm_events set city_id = '00000000-0000-0000-0002-000000000001' where city_id is null;
alter table public.storm_events alter column city_id set not null;
create index on public.storm_events(city_id, is_active);

insert into public.city_members (city_id, user_id, role)
values ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-0000000000d1', 'city_admin');