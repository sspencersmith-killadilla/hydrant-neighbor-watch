import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileUp, MapPinned, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCity } from "@/lib/session";
import { assetsQuery, districtsQuery } from "@/lib/queries";
import { slugify } from "@/lib/blockaid";
import { parseDistrictGeojson } from "@/lib/districts";
import { addNamedDistrict, deleteDistrict, importDistrictBoundaries, setDistrictMode } from "@/lib/blockaid.functions";
import { cn } from "@/lib/utils";

export function DistrictsSection() {
  const { city, demoArg } = useCity();
  const qc = useQueryClient();
  const router = useRouter();
  const { data: districts = [] } = useQuery(districtsQuery(city.id));
  const { data: assets = [] } = useQuery(assetsQuery(city.id));
  const [name, setName] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseDistrictGeojson> & { file: string } | null>(null);
  const setMode = useServerFn(setDistrictMode);
  const add = useServerFn(addNamedDistrict);
  const imp = useServerFn(importDistrictBoundaries);
  const del = useServerFn(deleteDistrict);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["districts"] });
    qc.invalidateQueries({ queryKey: ["assets"] });
    qc.invalidateQueries({ queryKey: ["cities"] });
    void router.invalidate();
  };
  const onErr = (e: Error) => toast.error(e.message);
  const modeM = useMutation({ mutationFn: (mode: "named" | "geojson") => setMode({ data: { demoRole: demoArg, cityId: city.id, mode } }), onSuccess: refresh, onError: onErr });
  const addM = useMutation({
    mutationFn: () => add({ data: { demoRole: demoArg, cityId: city.id, name, slug: slugify(name) } }),
    onSuccess: () => { toast.success(`${name} added`); setName(""); refresh(); }, onError: onErr,
  });
  const impM = useMutation({
    mutationFn: () => imp({ data: { demoRole: demoArg, cityId: city.id, districts: parsed!.districts } }),
    onSuccess: (r) => { toast.success(`${r.count} neighborhood boundaries saved; assets placed automatically`); setParsed(null); refresh(); }, onError: onErr,
  });
  const delM = useMutation({ mutationFn: (districtId: string) => del({ data: { demoRole: demoArg, cityId: city.id, districtId } }), onSuccess: refresh, onError: onErr });
  const count = (id: string) => assets.filter((a) => a.district_id === id).length;
  const mode = city.district_mode;

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold"><MapPinned className="size-5" /> Neighborhoods</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Split {city.name} into districts. Residents get a map for each one; dispatch and the Community page still add up citywide.
      </p>
      <div role="radiogroup" aria-label="Neighborhood setup" className="mt-4 grid gap-2 sm:grid-cols-2">
        {([["named", "Simple names", "Type names; tag assets with a district column."], ["geojson", "Boundary map file", "Upload GeoJSON shapes; assets placed automatically."]] as const).map(([v, l, h]) => (
          <button key={v} type="button" role="radio" aria-checked={mode === v} disabled={modeM.isPending}
            onClick={() => mode !== v && modeM.mutate(v)}
            className={cn("min-h-12 rounded-md border p-3 text-left", mode === v ? "border-primary bg-accent" : "hover:bg-secondary")}>
            <span className="block font-medium">{l}</span><span className="block text-sm text-muted-foreground">{h}</span>
          </button>
        ))}
      </div>

      {mode === "named" ? (
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); addM.mutate(); }}>
          <Input required minLength={2} maxLength={80} placeholder="e.g. Oak Ridge" className="h-12 max-w-sm" value={name} onChange={(e) => setName(e.target.value)} aria-label="Neighborhood name" />
          <Button type="submit" size="tap" disabled={addM.isPending || slugify(name).length < 2}><Plus className="!size-5" /> Add neighborhood</Button>
        </form>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-md bg-primary px-5 text-base font-medium text-primary-foreground hover:bg-primary/90">
            <FileUp className="h-5 w-5" /> Choose GeoJSON file
            <input type="file" accept=".geojson,.json,application/geo+json,application/json" className="sr-only"
              onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setParsed({ file: f.name, ...parseDistrictGeojson(await f.text()) }); }} />
          </label>
          <p className="text-xs text-muted-foreground">Polygon shapes in longitude/latitude. The name comes from a “name”, “neighborhood”, “district” or “ward” property. Re-uploading a name replaces its shape.</p>
          {parsed && (
            <div className="rounded-lg border p-4">
              <p className="font-semibold">{parsed.file}: {parsed.districts.length} neighborhood(s), {parsed.errors.length} problem(s)</p>
              {parsed.districts.length > 0 && <p className="mt-1 text-sm">{parsed.districts.map((d) => d.name).join(", ")}</p>}
              {parsed.errors.length > 0 && <ul className="mt-2 max-h-32 overflow-y-auto text-sm text-destructive">{parsed.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
              <div className="mt-3 flex gap-2">
                <Button size="tap" disabled={!parsed.districts.length || impM.isPending} onClick={() => impM.mutate()}>{impM.isPending ? "Saving…" : "Save boundaries"}</Button>
                <Button size="tap" variant="ghost" onClick={() => setParsed(null)}>Discard</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {districts.length > 0 && (
        <ul className="mt-4 divide-y rounded-md border">
          {districts.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span><span className="font-medium">{d.name}</span> <span className="text-sm text-muted-foreground">· {count(d.id)} assets · /c/{city.slug}?district={d.slug}{d.boundary ? " · has boundary" : ""}</span></span>
              <Button size="icon" variant="ghost" aria-label={`Remove ${d.name}`} onClick={() => confirm(`Remove ${d.name}? Its assets stay on the map without a neighborhood.`) && delM.mutate(d.id)}>
                <Trash2 className="size-5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
