<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- All writes go through server functions in `src/lib/blockaid.functions.ts` using the service client after `resolveActor`; tables only expose public SELECT. Why: lets demo-mode roles and real signed-in users share one authorization path.
- Demo role actions are honoured only in a city with `cities.is_demo` while `app_settings.demo_mode` is true; a signed-in user's real identity always wins. Why: real cities must never accept anonymous admin actions.
- Multi-tenant: every asset and storm event has `city_id`; admin rights are per city via `city_members` (`city_admin`), never `profiles.role`; every server function takes `cityId` and checks the asset belongs to it. Why: one deployment serves many cities without cross-city access.
- City pages live under `/c/$slug` (layout provides `CityProvider`); platform pages (/, /start, /guide, /self-host, /auth) render their own `SiteHeader`. Why: keeps city context out of platform pages.
- `/guide` and `/self-host` render `USER_GUIDE.md` and `SELF_HOSTING.md` via `?raw`. Why: one source for in-app and repository docs; keep the self-hosting guide free of any Lovable dependency.
- Report photos live in a private bucket and are shown via short-lived signed URLs. Why: workspace blocks public buckets.
- Leaflet is only loaded client-side through `LazyMap`. Why: Leaflet touches `window` at import and breaks SSR.
