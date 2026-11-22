# Expand the "Add your infrastructure" section of the user guide

Rewrite the Public Works section of the guide (in-app at /guide and in the repository) so a city can locate and load its assets without help.

## New content
1. **Where the data comes from** — most cities already keep storm drain, hydrant and snow-route layers in their mapping (GIS) system; export them to a spreadsheet (CSV). Coordinates must be decimal latitude/longitude (WGS 84, e.g. 41.5981, -93.6249), not state-plane or feet. Short tip on converting in common tools and on finding a single point's coordinates with a right-click in OpenStreetMap or Google Maps.
2. **Column table** — asset_code, asset_type, address_label, lat, lng with description and example for each, plus a sample three-row file.
3. **Step-by-step import** — download template, choose file, review problems listed by line number, import; re-importing the same asset_code updates the asset instead of duplicating it.
4. **Common problems** — swapped lat/lng, missing minus sign on western/southern coordinates, wrong asset_type spelling, duplicate codes in one file.
5. **What happens next** — assets appear on the map right away with the marker colors already described; the triage export includes code, type, address, lat, lng, issue, resident notes and report time (photos stay in the dispatch queue, not the file).

## Corrections
- Earlier chat answer said residents see coordinates and that the export includes photos; neither is true today. The guide will describe only current behavior.

## Technical details
- Edit only `USER_GUIDE.md`; `/guide` picks it up automatically.
