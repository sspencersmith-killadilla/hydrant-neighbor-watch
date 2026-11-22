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

### Pick your neighborhood

If your city has neighborhoods, use the **Neighborhood** menu at the top of the map to see only your area. Share a direct link like `/c/your-city?district=oak-ridge` with neighbors. The Community page shows how ready each neighborhood is for the next storm.

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

**Not sure which reason fits?** Describe the problem in your own words, then tap **Help me categorize this**. BlockAid's AI-powered helper suggests a reason (and selects it for you), writes a one-line summary, lists details worth adding (like water depth or whether a lane is blocked), and adds a safety reminder when needed. It's only a suggestion, so check the reason before you send.

### Stay safe

- Clear debris only from the curb or sidewalk.
- Wear bright or reflective clothing.
- Never step into traffic or moving or deep water.
- Stay at least 30 feet from downed wires. If anyone is in danger, call 911.

### Storm alerts

When Public Works starts **Storm Mode**, a banner appears at the top of the map with instructions and a **Citywide readiness** bar: the share of adopted storm drains that are cleared.

---

### Community, teams and badges

Open **Community** in your city's menu to see how your neighborhood is doing.

- **Storm-readiness:** the share of the city's storm drains currently marked cleared. During a storm alert you'll also see how many check-ins and residents have come in since the alert started.
- **Neighborhood readiness:** when your city has neighborhoods, each one is listed by the share of its storm drains cleared. Tap a name to open that neighborhood's map.
- **Impact totals:** assets adopted, check-ins, volunteers, and an estimate of debris kept out of drains (about 5 lbs per cleared check-in).
- **Teams:** sign in, then tap **Start a team** (block club, school, scout troop, local business, neighborhood association or other group) or **Join team** on an existing one. Teams are ranked by their members' check-ins. You can leave a team at any time.
- **Top volunteers:** the most active residents, shown by first name and last initial only.
- **Named assets:** every asset a neighbor has given a nickname.

#### Badges

| Badge | How to earn it |
|---|---|
| First Check-in | Submit your first check-in |
| Storm Sentinel | Mark an asset cleared within 6 hours of a storm alert |
| Autumn Veteran | Complete 5 or more leaf cleanouts |
| Guardian of Three | Look after 3 or more assets |
| Sharp Eye | Flag a problem that the city crew then fixes |

#### Volunteer certificate

On the Community page, tap **Print my certificate** for a printable certificate with your name, assets adopted, check-ins, estimated debris cleared and badges, useful for service hours or a front window.

## For Public Works staff

### Start your city

1. Go to **Start a city** and sign in with your work email.
2. Enter the city name, an optional state or region, and the web address you want (`/c/riverton`).
3. Search for your city to center the map, pick the right result, then **Create city**.

You are now the city's first admin. Share your city's web address with residents.

### Add your infrastructure

BlockAid places every asset on the map from its **geographic coordinates**. You load them from a spreadsheet file (CSV).

#### Where the data comes from

Most cities already keep layers for storm drains or catch basins, fire hydrants and sidewalk snow routes in their mapping (GIS) system. Export the layer you want to a CSV file.

Coordinates must be **decimal latitude and longitude** (WGS 84), for example `41.5981, -93.6249`. Coordinates in feet or state-plane systems will not work; ask your GIS team to export in WGS 84 (EPSG:4326), or reproject the layer in QGIS or ArcGIS before exporting.

No GIS file? You can find the coordinates of a single spot by right-clicking it in OpenStreetMap ("Show address") or Google Maps (the numbers at the top of the menu), and typing them into the template.

#### The file format

| Column | What it is | Example |
| --- | --- | --- |
| `asset_code` | Your city's own ID for the asset. Must be unique in the file. | `SD-2001` |
| `asset_type` | Exactly one of `storm_drain`, `fire_hydrant`, `priority_sidewalk` | `storm_drain` |
| `address_label` | A street address or intersection residents recognize | `610 Maple St & 6th Ave` |
| `lat` | Decimal latitude, -90 to 90 | `41.5981` |
| `lng` | Decimal longitude, -180 to 180 | `-93.6249` |
| `district` | Optional. A neighborhood name you already set up | `Oak Ridge` |

Sample file:

```csv
asset_code,asset_type,address_label,lat,lng
SD-2001,storm_drain,610 Maple St & 6th Ave,41.5981,-93.6249
FH-301,fire_hydrant,615 Oak Ave & 6th Ave,41.5983,-93.6219
PS-601,priority_sidewalk,"620 Elm St (Library route)",41.5980,-93.6188
```

Put quotes around an address that contains a comma. Extra columns are ignored — except `district`, which files that asset in the neighborhood you name.

#### Importing

1. Open **City Data** → **Import Assets via CSV**.
2. **Download sample template** if you want a starting file.
3. **Choose CSV file**. BlockAid checks it right away and lists any rows it can't use, with the line number and reason. Nothing is saved yet.
4. Fix those rows and choose the file again, or press **Import** to load just the valid rows.
5. If a row's `asset_code` already exists in your city, that asset's type, address and location are updated instead of creating a duplicate. You can re-import an updated GIS export at any time.

#### Common problems

- **Assets appear in the wrong country or the ocean:** `lat` and `lng` are swapped, or a minus sign is missing. In the Americas longitude is negative; south of the equator latitude is negative.
- **"Invalid asset_type":** check spelling — lowercase with underscores, e.g. `storm_drain`.
- **"Duplicate asset_code":** the same ID appears twice in one file. Only the first is kept.
- **"Missing column(s)":** the header row must include all five column names.

#### What happens next

Imported assets appear on your city's map immediately as gray (unadopted) markers that residents can adopt. Residents see the address label, not raw coordinates.

### Set up neighborhoods

On **City Data → Neighborhoods**, choose one of two ways (you pick when starting your city and can switch later):

- **Simple names** — type each neighborhood name (for example "Ward 3") and click **Add neighborhood**. To tag assets, add an optional `district` column to your asset CSV with the neighborhood name. Rows with a blank or unknown name stay citywide.
- **Boundary map file** — upload a GeoJSON file of neighborhood shapes (Polygon or MultiPolygon, longitude/latitude). Each shape's name comes from a `name`, `neighborhood`, `district` or `ward` property. BlockAid places every asset in the shape that contains it, now and on every later import. Uploading a shape with the same name replaces it.

In **Boundary map file** mode the `district` column is not used — each asset's coordinates decide its neighborhood.

Removing a neighborhood keeps its assets on the map without a neighborhood. The dispatch dashboard and exports always cover the whole city.

### Add colleagues

On **City Data** → **Public Works Staff**, enter a colleague's email. They must sign in to BlockAid once first.

### Dispatch dashboard

- **Top figures**: total assets, share adopted by residents, assets cleared, and open crew tickets.
- **Storm Mode**: start an event (title, severity, resident instructions) or end it. Starting a new event replaces the current one.
- **Reset All Adopted Assets to "Needs Check"**: use at the start of a storm so residents re-check. Assets waiting on a crew keep that status.
- **Priority Triage Queue**: every open crew ticket, sorted by **Newest** or **Severity** (downed wires first, then damaged infrastructure, standing water, clogged grates). Each row has the address, issue, a resident photo you can enlarge, and an **Open in Google Maps** link.
- **Mark Resolved by Crew**: closes the ticket and turns the asset green.

### Export for work orders

**City Data** → **Export Triage Report (CSV)** downloads every open crew ticket for 311 or work-order systems. Columns: `asset_code, asset_type, address_label, lat, lng, issue_type, resident_notes, reported_at`. Photos stay in the dispatch queue and are not included in the file.

---

### Spotlight a volunteer or team

As a city admin, open **Community** and fill in the spotlight box at the top (for example "Volunteer of the Month: Maria G." with a short message). It appears to everyone on the Community page. Clear the title and save to remove it.

## Questions

- **Is there a map fee?** No. Maps use free OpenStreetMap tiles.
- **Who sees photos?** Only dispatch staff, through links that expire after an hour.
- **Can one person manage several cities?** Yes. **Start a city** lists every city you manage.
