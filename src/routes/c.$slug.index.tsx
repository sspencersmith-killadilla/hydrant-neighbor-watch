import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StormBanner } from "@/components/blockaid/StormBanner";
import { LazyMap } from "@/components/blockaid/LazyMap";
import { AssetPanel } from "@/components/blockaid/AssetPanel";
import { assetsQuery, districtsQuery } from "@/lib/queries";
import { useNavigate } from "@tanstack/react-router";
import { filterAssets, type FilterKey } from "@/lib/blockaid";
import { cn } from "@/lib/utils";
import { useCity } from "@/lib/session";

export const Route = createFileRoute("/c/$slug/")({
  head: () => ({
    meta: [
      { title: "Resident Map — BlockAid" },
      { name: "description", content: "Find, adopt and report on storm drains, fire hydrants and priority sidewalks near you." },
      { property: "og:title", content: "Resident Map — BlockAid" },
      { property: "og:description", content: "Adopt a storm drain and help your neighborhood get ready for severe weather." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { district?: string } =>
    typeof s["district"] === "string" && s["district"] ? { district: s["district"] } : {},
  component: ResidentMap,
});

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "storm_drain", label: "Storm Drains" },
  { key: "fire_hydrant", label: "Fire Hydrants" },
  { key: "priority_sidewalk", label: "Sidewalks" },
  { key: "unadopted", label: "Unadopted Only" },
  { key: "needs_crew", label: "Needs Crew" },
];

const LEGEND = [
  { cls: "bg-unadopted", label: "Unadopted" },
  { cls: "bg-info", label: "Adopted / Needs Check" },
  { cls: "bg-success", label: "Cleared" },
  { cls: "bg-destructive", label: "Needs City Crew" },
];

function ResidentMap() {
  const { city } = useCity();
  const { data: assets = [], isError } = useQuery(assetsQuery(city.id));
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: districts = [] } = useQuery(districtsQuery(city.id));
  const { district: districtSlug } = Route.useSearch();
  const navigate = useNavigate({ from: "/c/$slug/" });
  const district = districts.find((d) => d.slug === districtSlug) ?? null;
  const visible = useMemo(
    () => filterAssets(district ? assets.filter((a) => a.district_id === district.id) : assets, filter),
    [assets, filter, district],
  );
  const mapCenter: [number, number] = district?.center_lat != null && district.center_lng != null ? [district.center_lat, district.center_lng] : [city.center_lat, city.center_lng];
  const selected = assets.find((a) => a.id === selectedId) ?? null;

  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">{city.name} asset map</h1>
      <StormBanner />
      <div className="relative min-h-[520px] flex-1">
        <LazyMap key={district?.id ?? "all"} center={mapCenter} boundaries={district ? [district] : districts} assets={visible} selectedId={selectedId} onSelect={(a) => setSelectedId(a.id)} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[400] p-3">
          {districts.length > 0 && (
            <label className="pointer-events-auto mb-2 inline-flex min-h-12 items-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold shadow-md">
              Neighborhood
              <select className="min-h-10 bg-transparent font-normal" value={district?.slug ?? ""}
                onChange={(e) => { setSelectedId(null); void navigate({ search: e.target.value ? { district: e.target.value } : {} }); }}>
                <option value="">All of {city.name}</option>
                {districts.map((d) => <option key={d.id} value={d.slug}>{d.name}</option>)}
              </select>
            </label>
          )}
          <div role="toolbar" aria-label="Filter assets" className="pointer-events-auto flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cn(
                  "min-h-12 shrink-0 rounded-full border px-4 text-sm font-semibold shadow-md transition-colors",
                  filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground hover:bg-accent",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="absolute bottom-3 left-3 z-[400] hidden rounded-lg border bg-card p-3 text-xs shadow-md sm:block">
          <p className="mb-1 font-semibold">{visible.length} assets shown{district ? ` in ${district.name}` : ""}</p>
          <ul className="space-y-1">
            {LEGEND.map((l) => (
              <li key={l.label} className="flex items-center gap-2"><span className={cn("h-3 w-3 rounded-full", l.cls)} />{l.label}</li>
            ))}
          </ul>
        </div>
        {isError && <p className="absolute left-1/2 top-20 z-[400] -translate-x-1/2 rounded bg-destructive px-3 py-2 text-sm text-destructive-foreground">Could not load assets. Refresh to try again.</p>}
        {assets.length === 0 && !isError && (
          <div className="absolute left-1/2 top-24 z-[400] w-[min(90%,28rem)] -translate-x-1/2 rounded-xl border bg-card p-4 text-center shadow-lg">
            <p className="font-semibold">No assets mapped in {city.name} yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">City staff can import storm drains, hydrants and sidewalks from the City Data page.</p>
          </div>
        )}
        {selected && <AssetPanel key={selected.id} asset={selected} onClose={() => setSelectedId(null)} />}
      </div>
    </main>
  );
}
