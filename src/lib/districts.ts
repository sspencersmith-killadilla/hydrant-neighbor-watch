import { slugify } from "./blockaid";

export type DistrictMode = "named" | "geojson";
export type Ring = [number, number][]; // [lng, lat]
export type Boundary = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };

export interface District {
  id: string;
  slug: string;
  name: string;
  center_lat: number | null;
  center_lng: number | null;
  boundary: Boundary | null;
}

function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(lng: number, lat: number, rings: Ring[]): boolean {
  const [outer, ...holes] = rings;
  return !!outer && inRing(lng, lat, outer) && !holes.some((h) => inRing(lng, lat, h));
}

/** True when the point (lat, lng) falls inside the boundary (holes excluded). */
export function pointInBoundary(lat: number, lng: number, b: Boundary): boolean {
  return b.type === "Polygon" ? inPolygon(lng, lat, b.coordinates) : b.coordinates.some((p) => inPolygon(lng, lat, p));
}

/** First district whose boundary contains the point, or null. */
export function districtForPoint<T extends { boundary: Boundary | null }>(lat: number, lng: number, districts: T[]): T | null {
  return districts.find((d) => d.boundary && pointInBoundary(lat, lng, d.boundary)) ?? null;
}

/** Matches a CSV "district" cell to a district by name or web address, ignoring case. */
export function districtByLabel<T extends { name: string; slug: string }>(label: string, districts: T[]): T | null {
  const l = label.trim().toLowerCase();
  if (!l) return null;
  return districts.find((d) => d.name.toLowerCase() === l || d.slug === slugify(l)) ?? null;
}

export function boundaryCenter(b: Boundary): { lat: number; lng: number } {
  const pts = (b.type === "Polygon" ? b.coordinates : b.coordinates.flat()).flat();
  const lngs = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
  return { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
}

const NAME_KEYS = ["name", "NAME", "Name", "neighborhood", "NEIGHBORHOOD", "district", "DISTRICT", "ward", "WARD", "label"];

/** Reads a GeoJSON FeatureCollection of Polygon/MultiPolygon features into districts. */
export function parseDistrictGeojson(text: string): { districts: { name: string; slug: string; boundary: Boundary; center_lat: number; center_lng: number }[]; errors: string[] } {
  const errors: string[] = [];
  let json: unknown;
  try { json = JSON.parse(text); } catch { return { districts: [], errors: ["File is not valid GeoJSON"] }; }
  const j = json as { type?: string; features?: unknown[] };
  const features = j.type === "FeatureCollection" ? j.features ?? [] : j.type === "Feature" ? [j] : [];
  if (!features.length) return { districts: [], errors: ["No features found. Export your boundaries as a GeoJSON FeatureCollection."] };
  const out: ReturnType<typeof parseDistrictGeojson>["districts"] = [];
  const seen = new Set<string>();
  features.forEach((f, i) => {
    const feat = f as { geometry?: { type?: string; coordinates?: unknown }; properties?: Record<string, unknown> };
    const g = feat.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon") || !Array.isArray(g.coordinates))
      return void errors.push(`Feature ${i + 1}: must be a Polygon or MultiPolygon`);
    const props = feat.properties ?? {};
    const key = NAME_KEYS.find((k) => typeof props[k] === "string" && (props[k] as string).trim());
    const name = key ? (props[key] as string).trim().slice(0, 80) : `District ${i + 1}`;
    const slug = slugify(name) || `district-${i + 1}`;
    if (seen.has(slug)) return void errors.push(`Feature ${i + 1}: duplicate name "${name}"`);
    seen.add(slug);
    const boundary = { type: g.type, coordinates: g.coordinates } as Boundary;
    const c = boundaryCenter(boundary);
    if (!Number.isFinite(c.lat) || Math.abs(c.lat) > 90 || Math.abs(c.lng) > 180)
      return void errors.push(`Feature ${i + 1}: coordinates must be longitude/latitude (WGS 84)`);
    out.push({ name, slug, boundary, center_lat: c.lat, center_lng: c.lng });
  });
  return { districts: out, errors };
}
