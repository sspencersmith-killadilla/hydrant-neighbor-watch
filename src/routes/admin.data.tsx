import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminGate } from "@/components/blockaid/AdminGate";
import { importAssets } from "@/lib/blockaid.functions";
import { assetsQuery, openCrewReportsQuery } from "@/lib/queries";
import { ASSET_TYPE_LABEL, SAMPLE_CSV, downloadText, parseAssetCsv, toCsv, type CsvAssetRow, type CsvRowError } from "@/lib/blockaid";
import { issueType } from "@/lib/triage";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/admin/data")({
  head: () => ({
    meta: [
      { title: "City Data Management — BlockAid" },
      { name: "description", content: "Import infrastructure from GIS via CSV and export open City Crew tickets for work orders." },
      { property: "og:title", content: "City Data Management — BlockAid" },
      { property: "og:description", content: "CSV import of city assets and triage report export for 311 systems." },
    ],
  }),
  component: () => <AdminGate><CityData /></AdminGate>,
});

function CityData() {
  const { demoArg } = useSession();
  const qc = useQueryClient();
  const { data: assets = [] } = useQuery(assetsQuery);
  const { data: openReports = [] } = useQuery(openCrewReportsQuery);
  const [parsed, setParsed] = useState<{ name: string; rows: CsvAssetRow[]; errors: CsvRowError[] } | null>(null);
  const imp = useServerFn(importAssets);
  const m = useMutation({
    mutationFn: () => imp({ data: { demoRole: demoArg, rows: parsed!.rows } }),
    onSuccess: (r) => { toast.success(`${r.count} assets imported`); setParsed(null); qc.invalidateQueries({ queryKey: ["assets"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const res = parseAssetCsv(await f.text());
    setParsed({ name: f.name, ...res });
  };

  const exportTriage = () => {
    const crew = assets.filter((a) => a.status === "needs_city_crew");
    const rows = crew.map((a) => {
      const r = openReports.find((x) => x.asset_id === a.id);
      return [a.asset_code, ASSET_TYPE_LABEL[a.asset_type], a.address_label, a.lat, a.lng, issueType(r?.notes), r?.notes ?? "", r?.created_at ?? a.last_updated_at];
    });
    downloadText(`blockaid-triage-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(["asset_code", "asset_type", "address_label", "lat", "lng", "issue_type", "resident_notes", "reported_at"], rows));
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">City Data Management</h1>
        <p className="text-sm text-muted-foreground">{assets.length} assets currently mapped.</p>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-bold">Import Assets via CSV</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Required columns: <code>asset_code, asset_type, address_label, lat, lng</code>. asset_type is one of storm_drain, fire_hydrant, priority_sidewalk.
          Rows with an existing asset_code update that asset.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="tap" variant="outline" onClick={() => downloadText("blockaid-asset-template.csv", SAMPLE_CSV)}>
            <Download className="!size-5" /> Download sample template
          </Button>
          <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-md bg-primary px-5 text-base font-medium text-primary-foreground hover:bg-primary/90">
            <FileUp className="h-5 w-5" /> Choose CSV file
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
        {parsed && (
          <div className="mt-4 rounded-lg border p-4">
            <p className="font-semibold">{parsed.name}: {parsed.rows.length} valid row(s), {parsed.errors.length} problem(s)</p>
            {parsed.errors.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-destructive">
                {parsed.errors.map((e, i) => <li key={i}>Line {e.line}: {e.message}</li>)}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              <Button size="tap" disabled={!parsed.rows.length || m.isPending} onClick={() => m.mutate()}>
                {m.isPending ? "Importing…" : `Import ${parsed.rows.length} asset(s)`}
              </Button>
              <Button size="tap" variant="ghost" onClick={() => setParsed(null)}>Discard</Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-bold">Export Triage Report</h2>
        <p className="mt-1 text-sm text-muted-foreground">Download all open “Needs City Crew” tickets for 311 or work-order systems.</p>
        <Button size="tap" className="mt-4" onClick={exportTriage}>
          <Download className="!size-5" /> Export Triage Report (CSV)
        </Button>
      </section>
    </main>
  );
}
