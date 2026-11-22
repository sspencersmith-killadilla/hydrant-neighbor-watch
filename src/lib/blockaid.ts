export type AssetType = "storm_drain" | "fire_hydrant" | "priority_sidewalk";
export type AssetStatus = "unassigned" | "needs_check" | "cleared" | "needs_city_crew";
export type DebrisType = "leaves" | "trash" | "ice_snow" | "structural_damage";
export type DemoRole = "resident" | "admin";

export interface Asset {
  id: string;
  asset_code: string;
  asset_type: AssetType;
  nickname: string | null;
  address_label: string;
  lat: number;
  lng: number;
  status: AssetStatus;
  adopted_by: string | null;
  last_updated_at: string;
}

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  storm_drain: "Storm Drain",
  fire_hydrant: "Fire Hydrant",
  priority_sidewalk: "Priority Sidewalk",
};

export const ASSET_TYPE_SHORT: Record<AssetType, string> = {
  storm_drain: "SD",
  fire_hydrant: "FH",
  priority_sidewalk: "PS",
};

export const STATUS_LABEL: Record<AssetStatus, string> = {
  unassigned: "Unadopted",
  needs_check: "Adopted · Needs Check",
  cleared: "Cleared",
  needs_city_crew: "Needs City Crew",
};

export const DEBRIS_LABEL: Record<DebrisType, string> = {
  leaves: "Leaves",
  trash: "Trash",
  ice_snow: "Ice / Snow",
  structural_damage: "Structural Damage",
};

export const CREW_REASONS = [
  "Clogged Grate",
  "Standing Water",
  "Damaged Infrastructure",
  "Downed Wire/Hazard",
] as const;
export type CrewReason = (typeof CREW_REASONS)[number];

export const DEMO_RESIDENT_ID = "00000000-0000-0000-0000-0000000000a1";
export const DEMO_ADMIN_ID = "00000000-0000-0000-0000-0000000000d1";

/** Share of adopted storm drains currently cleared, 0–100 (rounded). */
export function readinessPercent(assets: Pick<Asset, "asset_type" | "status" | "adopted_by">[]): number {
  const adopted = assets.filter((a) => a.asset_type === "storm_drain" && a.adopted_by);
  if (adopted.length === 0) return 0;
  const cleared = adopted.filter((a) => a.status === "cleared").length;
  return Math.round((cleared / adopted.length) * 100);
}

export type FilterKey = "all" | "storm_drain" | "fire_hydrant" | "priority_sidewalk" | "unadopted" | "needs_crew";

export function filterAssets<T extends Pick<Asset, "asset_type" | "status">>(assets: T[], f: FilterKey): T[] {
  switch (f) {
    case "all": return assets;
    case "unadopted": return assets.filter((a) => a.status === "unassigned");
    case "needs_crew": return assets.filter((a) => a.status === "needs_city_crew");
    default: return assets.filter((a) => a.asset_type === f);
  }
}

/** After a crew resolves a ticket the asset returns to Cleared. */
export function statusAfterCrewResolution(): AssetStatus {
  return "cleared";
}

export interface CsvAssetRow {
  asset_code: string;
  asset_type: AssetType;
  address_label: string;
  lat: number;
  lng: number;
}
export interface CsvRowError { line: number; message: string }

const CSV_COLUMNS = ["asset_code", "asset_type", "address_label", "lat", "lng"] as const;
export const SAMPLE_CSV =
  "asset_code,asset_type,address_label,lat,lng\n" +
  "SD-2001,storm_drain,610 Maple St & 6th Ave,41.5981,-93.6249\n" +
  "FH-301,fire_hydrant,615 Oak Ave & 6th Ave,41.5983,-93.6219\n" +
  'PS-601,priority_sidewalk,"620 Elm St (Library route)",41.5980,-93.6188\n';

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseAssetCsv(text: string): { rows: CsvAssetRow[]; errors: CsvRowError[] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  const errors: CsvRowError[] = [];
  const rows: CsvAssetRow[] = [];
  if (lines.length === 0) return { rows, errors: [{ line: 1, message: "File is empty" }] };
  const header = splitCsvLine(lines[0] ?? "").map((h) => h.toLowerCase());
  const idx = CSV_COLUMNS.map((c) => header.indexOf(c));
  const missing = CSV_COLUMNS.filter((_, i) => idx[i] === -1);
  if (missing.length) return { rows, errors: [{ line: 1, message: `Missing column(s): ${missing.join(", ")}` }] };
  const seen = new Set<string>();
  lines.slice(1).forEach((l, i) => {
    const line = i + 2;
    const cells = splitCsvLine(l);
    const get = (k: number) => cells[idx[k] ?? -1] ?? "";
    const code = get(0), type = get(1), addr = get(2);
    const lat = Number(get(3)), lng = Number(get(4));
    if (!code) return void errors.push({ line, message: "asset_code is required" });
    if (seen.has(code)) return void errors.push({ line, message: `Duplicate asset_code ${code}` });
    if (!["storm_drain", "fire_hydrant", "priority_sidewalk"].includes(type))
      return void errors.push({ line, message: `Invalid asset_type "${type}"` });
    if (!addr) return void errors.push({ line, message: "address_label is required" });
    if (get(3) === "" || !Number.isFinite(lat) || lat < -90 || lat > 90) return void errors.push({ line, message: "Invalid lat" });
    if (get(4) === "" || !Number.isFinite(lng) || lng < -180 || lng > 180) return void errors.push({ line, message: "Invalid lng" });
    seen.add(code);
    rows.push({ asset_code: code, asset_type: type as AssetType, address_label: addr, lat, lng });
  });
  return { rows, errors };
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** Turns a city name into a URL-safe address: lowercase letters, numbers and single dashes, max 48 chars. */
export function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/g, "");
}
