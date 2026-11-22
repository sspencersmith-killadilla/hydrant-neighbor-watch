create type public.app_role as enum ('resident','city_admin');
create type public.asset_type as enum ('storm_drain','fire_hydrant','priority_sidewalk');
create type public.asset_status as enum ('unassigned','needs_check','cleared','needs_city_crew');
create type public.report_status as enum ('cleared','needs_city_crew');
create type public.debris_type as enum ('leaves','trash','ice_snow','structural_damage');
create type public.storm_severity as enum ('advisory','watch','warning');

create table public.profiles (
  id uuid primary key,
  full_name text,
  email text,
  role public.app_role not null default 'resident',
  safety_waiver_accepted boolean not null default false,
  waiver_accepted_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null unique,
  asset_type public.asset_type not null,
  nickname text,
  address_label text not null,
  lat double precision not null,
  lng double precision not null,
  status public.asset_status not null default 'unassigned',
  adopted_by uuid references public.profiles(id) on delete set null,
  last_updated_at timestamptz not null default now()
);
grant select on public.assets to anon, authenticated;
grant all on public.assets to service_role;
alter table public.assets enable row level security;
create policy "Assets are public" on public.assets for select to anon, authenticated using (true);

create table public.status_reports (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  status public.report_status not null,
  debris_type public.debris_type,
  notes text,
  photo_url text,
  resolved_by_city boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.status_reports(asset_id, created_at desc);
grant select on public.status_reports to anon, authenticated;
grant all on public.status_reports to service_role;
alter table public.status_reports enable row level security;
create policy "Reports are public" on public.status_reports for select to anon, authenticated using (true);

create table public.storm_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  severity public.storm_severity not null default 'watch',
  is_active boolean not null default false,
  instructions text,
  created_at timestamptz not null default now()
);
grant select on public.storm_events to anon, authenticated;
grant all on public.storm_events to service_role;
alter table public.storm_events enable row level security;
create policy "Storm events are public" on public.storm_events for select to anon, authenticated using (true);

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  demo_mode boolean not null default true
);
grant select on public.app_settings to anon, authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "Settings are public" on public.app_settings for select to anon, authenticated using (true);
insert into public.app_settings (id, demo_mode) values (1, true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'resident') on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name, email, role, safety_waiver_accepted, waiver_accepted_at) values
('00000000-0000-0000-0000-0000000000a1','Demo Resident (Jordan Ellis)','demo.resident@blockaid.local','resident',true,now()-interval '30 days'),
('00000000-0000-0000-0000-0000000000a2','Priya Natarajan','priya.n@blockaid.local','resident',true,now()-interval '60 days'),
('00000000-0000-0000-0000-0000000000a3','Marcus Bell','marcus.b@blockaid.local','resident',true,now()-interval '45 days'),
('00000000-0000-0000-0000-0000000000d1','Demo Public Works Admin','demo.admin@blockaid.local','city_admin',true,now()-interval '90 days');

insert into public.storm_events (title, severity, is_active, instructions) values
('Heavy Rain & Flash Flood Watch','watch',true,'1.5–3 inches of rain expected tonight through Tuesday morning. Clear leaves and trash from the top of your adopted grate before 6 PM. Stay on the curb, wear reflective clothing, and never step into moving water.');
insert into public.assets (id,asset_code,asset_type,nickname,address_label,lat,lng,status,adopted_by,last_updated_at) values
('00000000-0000-0000-0001-000000000001','SD-1044','storm_drain','Drainy McDrainface','133 Maple St & 1st Ave',41.586530,-93.625167,'needs_check','00000000-0000-0000-0000-0000000000a1',now()-interval '19 hours'),
('00000000-0000-0000-0001-000000000002','SD-1045','storm_drain','Sir Clears-a-Lot','141 Oak Ave & 1st Ave',41.586843,-93.621964,'cleared','00000000-0000-0000-0000-0000000000a1',now()-interval '25 hours'),
('00000000-0000-0000-0001-000000000003','SD-1046','storm_drain','The Leaf Catcher','104 Elm St & 1st Ave',41.586829,-93.619262,'needs_check','00000000-0000-0000-0000-0000000000a3',now()-interval '69 hours'),
('00000000-0000-0000-0001-000000000004','SD-1050','storm_drain',null,'126 Walnut St & 1st Ave',41.586966,-93.616021,'unassigned',null,now()-interval '47 hours'),
('00000000-0000-0000-0001-000000000005','SD-1053','storm_drain','Gutter Guardian','112 Cedar Ave & 1st Ave',41.586649,-93.613192,'cleared','00000000-0000-0000-0000-0000000000a1',now()-interval '68 hours'),
('00000000-0000-0000-0001-000000000006','SD-1056','storm_drain',null,'104 Birch St & 1st Ave',41.586938,-93.610127,'unassigned',null,now()-interval '16 hours'),
('00000000-0000-0000-0001-000000000007','SD-1060','storm_drain','Big Gulp','226 Maple St & 2nd Ave',41.588799,-93.625095,'cleared','00000000-0000-0000-0000-0000000000a2',now()-interval '10 hours'),
('00000000-0000-0000-0001-000000000008','SD-1063','storm_drain',null,'226 Oak Ave & 2nd Ave',41.588904,-93.622090,'cleared','00000000-0000-0000-0000-0000000000a3',now()-interval '9 hours'),
('00000000-0000-0000-0001-000000000009','SD-1066','storm_drain','Old Faithful','204 Elm St & 2nd Ave',41.588984,-93.618902,'needs_city_crew','00000000-0000-0000-0000-0000000000a3',now()-interval '58 hours'),
('00000000-0000-0000-0001-000000000010','SD-1069','storm_drain',null,'218 Walnut St & 2nd Ave',41.589130,-93.615768,'cleared','00000000-0000-0000-0000-0000000000a1',now()-interval '46 hours'),
('00000000-0000-0000-0001-000000000011','SD-1070','storm_drain',null,'218 Cedar Ave & 2nd Ave',41.588996,-93.613169,'unassigned',null,now()-interval '17 hours'),
('00000000-0000-0000-0001-000000000012','SD-1072','storm_drain','Captain Flow','226 Birch St & 2nd Ave',41.588939,-93.609750,'needs_check','00000000-0000-0000-0000-0000000000a1',now()-interval '52 hours'),
('00000000-0000-0000-0001-000000000013','SD-1075','storm_drain',null,'333 Maple St & 3rd Ave',41.591430,-93.624808,'unassigned',null,now()-interval '36 hours'),
('00000000-0000-0000-0001-000000000014','SD-1079','storm_drain',null,'326 Oak Ave & 3rd Ave',41.591492,-93.621890,'needs_city_crew',null,now()-interval '30 hours'),
('00000000-0000-0000-0001-000000000015','SD-1081','storm_drain',null,'341 Elm St & 3rd Ave',41.590950,-93.619209,'unassigned',null,now()-interval '30 hours'),
('00000000-0000-0000-0001-000000000016','SD-1082','storm_drain',null,'318 Walnut St & 3rd Ave',41.591191,-93.615947,'unassigned',null,now()-interval '37 hours'),
('00000000-0000-0000-0001-000000000017','SD-1083','storm_drain','Splash Zone','333 Cedar Ave & 3rd Ave',41.590987,-93.612979,'needs_check','00000000-0000-0000-0000-0000000000a3',now()-interval '17 hours'),
('00000000-0000-0000-0001-000000000018','SD-1084','storm_drain','Grate Expectations','341 Birch St & 3rd Ave',41.591174,-93.609777,'cleared','00000000-0000-0000-0000-0000000000a3',now()-interval '52 hours'),
('00000000-0000-0000-0001-000000000019','FH-221','fire_hydrant',null,'412 Maple St & 4th Ave',41.593389,-93.625060,'needs_check','00000000-0000-0000-0000-0000000000a1',now()-interval '57 hours'),
('00000000-0000-0000-0001-000000000020','FH-223','fire_hydrant',null,'404 Oak Ave & 4th Ave',41.593166,-93.621940,'unassigned',null,now()-interval '1 hours'),
('00000000-0000-0000-0001-000000000021','FH-225','fire_hydrant','The Swirl','433 Elm St & 4th Ave',41.593422,-93.618731,'needs_check','00000000-0000-0000-0000-0000000000a1',now()-interval '27 hours'),
('00000000-0000-0000-0001-000000000022','FH-229','fire_hydrant','Hydro Hank','418 Walnut St & 4th Ave',41.593189,-93.616149,'needs_city_crew','00000000-0000-0000-0000-0000000000a3',now()-interval '16 hours'),
('00000000-0000-0000-0001-000000000023','FH-230','fire_hydrant','Puddle Patrol','426 Cedar Ave & 4th Ave',41.593609,-93.612704,'cleared','00000000-0000-0000-0000-0000000000a2',now()-interval '11 hours'),
('00000000-0000-0000-0001-000000000024','FH-231','fire_hydrant','Little Niagara','426 Birch St & 4th Ave',41.593550,-93.609856,'needs_check','00000000-0000-0000-0000-0000000000a3',now()-interval '3 hours'),
('00000000-0000-0000-0001-000000000025','FH-233','fire_hydrant','Curbside Carl','512 Maple St & 5th Ave',41.595871,-93.624983,'cleared','00000000-0000-0000-0000-0000000000a3',now()-interval '4 hours'),
('00000000-0000-0000-0001-000000000026','PS-513','priority_sidewalk','Ms. Clearwater','541 Oak Ave (Senior Center route)',41.595887,-93.621782,'cleared','00000000-0000-0000-0000-0000000000a2',now()-interval '22 hours'),
('00000000-0000-0000-0001-000000000027','PS-515','priority_sidewalk','Rusty','518 Elm St (Senior Center route)',41.595620,-93.618833,'needs_check','00000000-0000-0000-0000-0000000000a3',now()-interval '25 hours'),
('00000000-0000-0000-0001-000000000028','PS-517','priority_sidewalk',null,'512 Walnut St (Senior Center route)',41.595791,-93.615856,'needs_city_crew',null,now()-interval '26 hours'),
('00000000-0000-0000-0001-000000000029','PS-521','priority_sidewalk','Sidewalk Sally','504 Cedar Ave (Senior Center route)',41.595513,-93.613283,'cleared','00000000-0000-0000-0000-0000000000a2',now()-interval '25 hours'),
('00000000-0000-0000-0001-000000000030','PS-524','priority_sidewalk','Torrent Tom','518 Birch St (Senior Center route)',41.595568,-93.609738,'needs_city_crew','00000000-0000-0000-0000-0000000000a2',now()-interval '14 hours');
insert into public.status_reports (asset_id,reporter_id,status,debris_type,notes,photo_url,resolved_by_city,created_at) values
('00000000-0000-0000-0001-000000000002','00000000-0000-0000-0000-0000000000a1','cleared','trash','Cleared ahead of the storm.',null,false,now()-interval '25 hours'),
('00000000-0000-0000-0001-000000000005','00000000-0000-0000-0000-0000000000a1','cleared','trash','Cleared ahead of the storm.',null,false,now()-interval '68 hours'),
('00000000-0000-0000-0001-000000000007','00000000-0000-0000-0000-0000000000a2','cleared',null,'Cleared ahead of the storm.',null,false,now()-interval '10 hours'),
('00000000-0000-0000-0001-000000000008','00000000-0000-0000-0000-0000000000a3','cleared','leaves','Cleared ahead of the storm.',null,false,now()-interval '9 hours'),
('00000000-0000-0000-0001-000000000009','00000000-0000-0000-0000-0000000000a3','needs_city_crew','structural_damage','Damaged Infrastructure: Grate cover is cracked and sinking on the north edge; trip hazard for pedestrians.',null,false,now()-interval '58 hours'),
('00000000-0000-0000-0001-000000000010','00000000-0000-0000-0000-0000000000a1','cleared','leaves','Cleared ahead of the storm.',null,false,now()-interval '46 hours'),
('00000000-0000-0000-0001-000000000014',null,'needs_city_crew','trash','Clogged Grate: Grate fully blocked by construction debris and plastic bags. Too heavy to remove safely by hand.',null,false,now()-interval '30 hours'),
('00000000-0000-0000-0001-000000000018','00000000-0000-0000-0000-0000000000a3','cleared','trash','Cleared ahead of the storm.',null,false,now()-interval '52 hours'),
('00000000-0000-0000-0001-000000000022','00000000-0000-0000-0000-0000000000a3','needs_city_crew',null,'Standing Water: Water pooling about 8 inches deep across the crosswalk after this morning''s rain. Drain not taking water.',null,false,now()-interval '16 hours'),
('00000000-0000-0000-0001-000000000023','00000000-0000-0000-0000-0000000000a2','cleared','leaves','Cleared ahead of the storm.',null,false,now()-interval '11 hours'),
('00000000-0000-0000-0001-000000000025','00000000-0000-0000-0000-0000000000a3','cleared',null,'Cleared ahead of the storm.',null,false,now()-interval '4 hours'),
('00000000-0000-0000-0001-000000000026','00000000-0000-0000-0000-0000000000a2','cleared','trash','Cleared ahead of the storm.',null,false,now()-interval '22 hours'),
('00000000-0000-0000-0001-000000000028',null,'needs_city_crew',null,'Downed Wire/Hazard: Low-hanging cable hanging across the sidewalk after last night''s wind. Did not touch it.',null,false,now()-interval '26 hours'),
('00000000-0000-0000-0001-000000000029','00000000-0000-0000-0000-0000000000a2','cleared',null,'Cleared ahead of the storm.',null,false,now()-interval '25 hours'),
('00000000-0000-0000-0001-000000000030','00000000-0000-0000-0000-0000000000a2','needs_city_crew','leaves','Clogged Grate: Heavy leaf mat compacted under the grate. Cleared top layer but inlet below is still blocked.',null,false,now()-interval '14 hours');