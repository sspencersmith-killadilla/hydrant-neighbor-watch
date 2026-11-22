# BlockAid — Implementation Plan

## What gets built
A civic volunteer app with two experiences: a Resident map portal (default) and a Public Works dispatch dashboard, both available immediately with realistic demo data.

## Pages
- `/` Resident Map: storm alert banner + readiness bar, full-bleed map, floating filter pills, asset detail drawer (bottom sheet on mobile, side drawer on desktop), Adopt modal with mandatory safety waiver, Mark Cleared and Flag for City Crew flows with photo upload.
- `/my-assets` My Adopted Assets: list, one-tap Mark Cleared, personal check-in count.
- `/admin` Dispatch Dashboard: KPI strip, Storm Mode control panel (activate/deactivate, severity, instructions, reset adopted assets to Needs Check), triage queue table + map, photo lightbox, Google Maps links, Mark Resolved by Crew.
- `/admin/data` City Data: CSV import with sample template download, triage report CSV export.
- `/auth` Email magic-link sign-in.
- Header: BlockAid wordmark, nav, sign-in state, Demo Role Switcher (Resident / Public Works Admin).

## Demo mode and sign-in (edge case decisions)
- Browsing the map and filters works signed-out.
- Adopting, reporting, and admin actions: in demo mode, the role switcher lets evaluators act as a shared demo resident or demo admin without logging in. Writes go through server functions that accept demo actions only while a `DEMO_MODE` setting is on; turning it off makes the app require real magic-link sign-in and real `city_admin` roles.
- Anonymous reporting: allowed for Mark Cleared / Flag (reporter_id null), adoption requires a resident identity.
- Waiver acceptance is stored on the profile; once accepted it is not re-asked.
- Readiness % = adopted drains cleared / adopted drains while a storm is active.
- Only one active storm event at a time; activating a new one deactivates others.
- Resolving a ticket sets asset to Cleared and marks open reports `resolved_by_city = true`.
- CSV import upserts by asset_code; invalid rows are reported back, not silently skipped.

## Design
Navy headers, white cards, slate background, emerald/crimson/amber status tokens (all as semantic tokens), Plus Jakarta Sans headings + Inter body, 48px minimum tap targets, AA contrast, red pulsing marker for Needs Crew.

## Technical details
- Lovable Cloud: tables `profiles`, `user_roles` (separate roles table with `has_role`, not a role column on profiles, to avoid privilege escalation; profile exposes role for display), `assets`, `status_reports`, `storm_events`, with GRANTs + RLS: public read on assets/storm_events/report summaries; residents write own reports/adoptions; admins full control.
- Storage bucket `report-photos` (public read, upload via server).
- Seed migration with literal INSERTs: 30 assets (18 drains, 7 hydrants, 5 sidewalks) on a grid around a sample neighborhood, 10 cleared, 5 needs-crew with notes, nicknamed adoptions, 1 active "Heavy Rain & Flash Flood Watch".
- Map: react-leaflet + OSM tiles, lazy-loaded client-only (Leaflet breaks SSR), custom divIcon markers.
- Data via TanStack Query + `createServerFn`; email magic-link auth enabled; head() metadata per route.
- Tests: readiness % calculation, CSV row validation, resolve-ticket status rule.
