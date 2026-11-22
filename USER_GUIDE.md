# BlockAid user guide

BlockAid helps a city keep storm drains, fire hydrants and priority sidewalks clear before and during severe weather. Residents adopt and check on assets near them; Public Works staff see what needs a crew.

Every city has its own space at `/c/<city-address>`, for example `/c/maple-heights-demo`.

## Try the demo city

Open **Try the demo city** on the home page. No account is needed. Use the **Demo** switch in the header to move between **Resident View** and **Public Works Admin**. Changes you make in the demo city are visible to everyone else trying it.

---

## For residents

### Find an asset

1. Open your city's map.
2. Use the filter buttons at the top: **All**, **Storm Drains**, **Fire Hydrants**, **Sidewalks**, **Unadopted Only**, **Needs Crew**.
3. Tap a marker to open its details. Marker colors mean:

| Color | Meaning |
| --- | --- |
| Gray | Nobody has adopted it yet |
| Blue | Adopted, needs a check |
| Green | Cleared |
| Red, pulsing | Waiting on a City Crew |

The letters on each marker show the type: **SD** storm drain, **FH** fire hydrant, **PS** priority sidewalk.

### Adopt an asset

1. Sign in with your email (we send a one-tap link — no password).
2. Tap a gray marker, then **Adopt This Asset**.
3. Give it a nickname if you like.
4. Read and accept the safety waiver. You only accept it once.

### Mark it cleared

Tap **Mark Cleared**, optionally pick what you removed (leaves, trash, ice/snow) and add a photo. You can also do this in one tap from **My Assets**.

### Flag it for the City Crew

Tap **Flag for City Crew** when something is beyond what a volunteer should handle. Pick a reason — **Clogged Grate**, **Standing Water**, **Damaged Infrastructure** or **Downed Wire/Hazard** — add a short note and a photo if you can safely take one.

You don't have to adopt an asset or sign in to clear it or flag it.

### Stay safe

- Clear debris only from the curb or sidewalk.
- Wear bright or reflective clothing.
- Never step into traffic or moving or deep water.
- Stay at least 30 feet from downed wires. If anyone is in danger, call 911.

### Storm alerts

When Public Works starts **Storm Mode**, a banner appears at the top of the map with instructions and a **Citywide readiness** bar: the share of adopted storm drains that are cleared.

---

## For Public Works staff

### Start your city

1. Go to **Start a city** and sign in with your work email.
2. Enter the city name, an optional state or region, and the web address you want (`/c/riverton`).
3. Search for your city to center the map, pick the right result, then **Create city**.

You are now the city's first admin. Share your city's web address with residents.

### Add your infrastructure

Open **City Data** → **Import Assets via CSV**.

1. **Download sample template** to see the format.
2. Your file needs these columns: `asset_code, asset_type, address_label, lat, lng`.
   `asset_type` is `storm_drain`, `fire_hydrant` or `priority_sidewalk`.
3. **Choose CSV file**. BlockAid lists any rows it can't use and why, before you import.
4. Press **Import**. If a row's `asset_code` is already in your city, that asset is updated instead of duplicated.

### Add colleagues

On **City Data** → **Public Works Staff**, enter a colleague's email. They must sign in to BlockAid once first.

### Dispatch dashboard

- **Top figures**: total assets, share adopted by residents, assets cleared, and open crew tickets.
- **Storm Mode**: start an event (title, severity, resident instructions) or end it. Starting a new event replaces the current one.
- **Reset All Adopted Assets to "Needs Check"**: use at the start of a storm so residents re-check. Assets waiting on a crew keep that status.
- **Priority Triage Queue**: every open crew ticket, sorted by **Newest** or **Severity** (downed wires first, then damaged infrastructure, standing water, clogged grates). Each row has the address, issue, a resident photo you can enlarge, and an **Open in Google Maps** link.
- **Mark Resolved by Crew**: closes the ticket and turns the asset green.

### Export for work orders

**City Data** → **Export Triage Report (CSV)** downloads every open crew ticket for 311 or work-order systems.

---

## Questions

- **Is there a map fee?** No. Maps use free OpenStreetMap tiles.
- **Who sees photos?** Only dispatch staff, through links that expire after an hour.
- **Can one person manage several cities?** Yes. **Start a city** lists every city you manage.
