# Self-hosting BlockAid

BlockAid is a standard web app you can run on your own accounts. You need no Lovable account or tools. This guide sets up:

- **Database, sign-in and file storage**: [Supabase](https://supabase.com), either their hosted service (free tier works) or [self-hosted Supabase](https://supabase.com/docs/guides/self-hosting) on your own servers.
- **Web app**: [Cloudflare Workers](https://workers.cloudflare.com) (free tier works). Any host that runs Nitro output can work; Cloudflare is the tested path.
- **Maps**: OpenStreetMap tiles, with no key and no cost. Please follow the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/). For heavy traffic, run your own tile server or use a tile provider and change the `url` in `src/components/blockaid/AssetMap.tsx`.

## What you need

- The BlockAid source code (a copy of this repository)
- [Bun](https://bun.sh) 1.1 or newer
- `psql` (PostgreSQL client), or the Supabase SQL editor
- A Supabase project and a Cloudflare account
- A domain name (optional; Cloudflare gives you a `workers.dev` address)

## 1. Get the code

```bash
git clone <your-copy-of-the-repository> blockaid
cd blockaid
bun install
```

## 2. Create the database

1. Create a Supabase project. Note its **Project URL**, **publishable (anon) key**, **service role key** and the **database connection string** (Project Settings → Database).
2. Apply every SQL file in `drizzle/migrations/`, in filename order:

```bash
export DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@db.YOUR-PROJECT.supabase.co:5432/postgres"
for f in drizzle/migrations/*.sql; do
  echo "Applying $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

| File | What it does |
| --- | --- |
| `0000_blockaid_schema_and_seed.sql` | Tables, security rules, signup trigger, and the demo data |
| `0001_multi_city.sql` | Cities, city admins, and the "Maple Heights (Demo)" city |
| `0002_limit_report_columns.sql` | Hides who filed each report and its photo from public reads |

Apply files added later the same way, and only once each.

**No demo city?** After migrating, run:

```sql
delete from public.cities where is_demo;
update public.app_settings set demo_mode = false;
```

Never turn off row-level security. The app's tables only allow public reading. Every change goes through the app's server, which checks who is asking.

## 3. Create photo storage

In Supabase → **Storage**, create a bucket:

- Name: `report-photos`
- Public: **off**
- File size limit: `8 MB`
- Allowed types: `image/*`

Add no storage policies. Only the app's server touches this bucket, and it shows photos through links that expire after an hour.

## 4. Set up sign-in

BlockAid signs people in with an email link (no passwords).

1. Supabase → **Authentication → Providers → Email**: enable email sign-in.
2. **Authentication → URL Configuration**:
   - Site URL: `https://blockaid.your-city.gov` (your final address)
   - Redirect URLs: add `https://blockaid.your-city.gov/**` and `http://localhost:8080/**`
3. **Authentication → SMTP**: connect your own mail server or provider. Supabase's built-in sender is rate-limited and meant only for testing.
4. Optional: edit the **Magic Link** email template to say "BlockAid".

## 5. Configure environment variables

Create `.env` in the project folder. Git ignores it; never commit it.

```dotenv
# Used in the browser (safe to expose)
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
VITE_SUPABASE_PROJECT_ID=YOUR-PROJECT-REF

# Used on the server
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` has full database access. Keep it server-side only: never put it in a `VITE_` variable or in the repository.

## 6. Run it locally

```bash
bun run dev
```

Open http://localhost:8080. Run the automated checks with `bun run test`.

## 7. Deploy to Cloudflare Workers

The build is set up for Cloudflare's `cloudflare-module` format.

```bash
bun run build                       # VITE_* values from .env are built into the browser code
npx wrangler login
npx wrangler deploy --config dist/server/wrangler.json --name blockaid
```

Then give the live app its server variables (enter each value when asked):

```bash
npx wrangler secret put SUPABASE_URL --name blockaid
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY --name blockaid
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name blockaid
```

Rebuild and redeploy after changing any `VITE_` value. Secrets apply without a rebuild.

### Use your own domain

In Cloudflare → **Workers & Pages → blockaid → Settings → Domains & Routes**, add a custom domain such as `blockaid.your-city.gov`. Then update the Supabase Site URL and Redirect URLs from step 4 to match.

## 8. Make the first administrator

Sign in once at `/auth`, then open `/start` and create your city. The person who creates a city becomes its admin. That admin adds colleagues on the **City Data** page.

To make someone an admin directly in the database:

```sql
insert into public.city_members (city_id, user_id, role)
select c.id, p.id, 'city_admin'
from public.cities c, public.profiles p
where c.slug = 'your-city' and p.email = 'staff@your-city.gov';
```

## Updating

```bash
git pull
bun install
# apply any new files in drizzle/migrations/ (step 2)
bun run build && npx wrangler deploy --config dist/server/wrangler.json --name blockaid
```

## Backups

Supabase's paid plans include daily backups. On the free tier or self-hosted, schedule your own:

```bash
pg_dump "$DATABASE_URL" --schema=public --no-owner > blockaid-$(date +%F).sql
```

Photos are in the `report-photos` bucket; back them up with the Supabase CLI or any S3-compatible tool.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Sign-in link opens the wrong site | Check the Site URL and Redirect URLs (step 4) |
| No sign-in email arrives | Configure SMTP (step 4); check spam |
| "Missing Supabase environment variable" | Set the Worker secrets (step 7) |
| Map is blank | Your network may block `tile.openstreetmap.org`; switch tile providers |
| "Public Works admin access required" | Add the user to `city_members` (step 8) |
