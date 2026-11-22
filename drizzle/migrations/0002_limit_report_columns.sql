revoke select on public.status_reports from anon, authenticated;
grant select (id, asset_id, status, debris_type, notes, resolved_by_city, created_at) on public.status_reports to anon, authenticated;