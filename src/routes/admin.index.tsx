import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ExternalLink, RotateCcw, Siren, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AdminGate } from "@/components/blockaid/AdminGate";
import { LazyMap } from "@/components/blockaid/LazyMap";
import { activeStormQuery, assetsQuery, openCrewReportsQuery, stormClearsQuery } from "@/lib/queries";
import { activateStorm, deactivateStorm, getPhotoUrls, resetAdoptedAssets, resolveTicket } from "@/lib/blockaid.functions";
import { ASSET_TYPE_LABEL } from "@/lib/blockaid";
import { issueSeverity, issueType } from "@/lib/triage";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Public Works Dispatch — BlockAid" },
      { name: "description", content: "Real-time triage of resident reports and storm readiness for Public Works crews." },
      { property: "og:title", content: "Public Works Dispatch — BlockAid" },
      { property: "og:description", content: "Storm mode controls, KPIs and the City Crew triage queue." },
    ],
  }),
  component: () => <AdminGate><Dispatch /></AdminGate>,
});

function Dispatch() {
  const { demoArg } = useSession();
  const qc = useQueryClient();
  const { data: assets = [] } = useQuery(assetsQuery);
  const { data: storm } = useQuery(activeStormQuery);
  const { data: openReports = [] } = useQuery(openCrewReportsQuery);
  const { data: clearedInEvent = 0 } = useQuery(stormClearsQuery(storm?.created_at ?? null));
  const [sort, setSort] = useState<"newest" | "severity">("newest");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const crewAssets = assets.filter((a) => a.status === "needs_city_crew");
  const rows = useMemo(() => {
    const r = crewAssets.map((a) => ({ asset: a, report: openReports.find((x) => x.asset_id === a.id) }));
    return r.sort((x, y) =>
      sort === "severity"
        ? issueSeverity(y.report?.notes) - issueSeverity(x.report?.notes)
        : (y.report?.created_at ?? y.asset.last_updated_at).localeCompare(x.report?.created_at ?? x.asset.last_updated_at),
    );
  }, [crewAssets, openReports, sort]);

  const photoPaths = rows.map((r) => r.report?.photo_url).filter((p): p is string => !!p);
  const fetchPhotos = useServerFn(getPhotoUrls);
  const { data: photoUrls = {} } = useQuery({
    queryKey: ["photos", photoPaths],
    queryFn: () => fetchPhotos({ data: { paths: photoPaths } }),
    enabled: photoPaths.length > 0,
  });

  const resolve = useServerFn(resolveTicket);
  const resolveM = useMutation({
    mutationFn: (assetId: string) => resolve({ data: { demoRole: demoArg, assetId } }),
    onSuccess: () => { toast.success("Ticket resolved · asset marked Cleared"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["assets"] }); qc.invalidateQueries({ queryKey: ["reports"] }); qc.invalidateQueries({ queryKey: ["storm"] }); };

  const adopted = assets.filter((a) => a.adopted_by).length;
  const kpis = [
    { label: "Total Mapped Assets", value: assets.length },
    { label: "% Adopted by Residents", value: assets.length ? `${Math.round((adopted / assets.length) * 100)}%` : "0%" },
    { label: storm ? "Cleared in Current Event" : "Cleared (all time)", value: clearedInEvent },
    { label: "Open “Needs City Crew” Tickets", value: crewAssets.length, danger: true },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Public Works & Emergency Dispatch</h1>
        <p className="text-sm text-muted-foreground">Live view of resident reports across the service area.</p>
      </div>

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={cn("rounded-xl border bg-card p-4", k.danger && "border-destructive bg-destructive text-destructive-foreground")}>
            <p className={cn("text-xs font-semibold uppercase tracking-wide", k.danger ? "opacity-90" : "text-muted-foreground")}>{k.label}</p>
            <p className="mt-1 font-display text-3xl font-bold">{k.value}</p>
          </div>
        ))}
      </section>

      <StormPanel storm={storm ?? null} onChange={invalidate} />

      <section aria-label="Priority triage queue" className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Wrench className="h-5 w-5 text-destructive" /> Priority Triage Queue</h2>
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm" role="group" aria-label="Sort">
            {(["newest", "severity"] as const).map((s) => (
              <button key={s} aria-pressed={sort === s} onClick={() => setSort(s)} className={cn("min-h-10 rounded-md px-3 font-semibold", sort === s ? "bg-card shadow" : "text-muted-foreground")}>
                {s === "newest" ? "Newest" : "Severity"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid lg:grid-cols-5">
          <div className="overflow-x-auto lg:col-span-3">
            {rows.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">No open City Crew tickets. All clear.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="p-3">Asset</th><th className="p-3">Issue</th><th className="p-3">Photo</th><th className="p-3">Action</th></tr>
                </thead>
                <tbody>
                  {rows.map(({ asset: a, report }) => (
                    <tr key={a.id} className={cn("border-t align-top", selectedId === a.id && "bg-accent")} onClick={() => setSelectedId(a.id)}>
                      <td className="p-3">
                        <p className="font-bold">{a.asset_code}</p>
                        <p className="text-xs text-muted-foreground">{ASSET_TYPE_LABEL[a.asset_type]}</p>
                        <p>{a.address_label}</p>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-info underline">
                          Open in Google Maps <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="p-3">
                        <span className="inline-block rounded bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">{issueType(report?.notes)}</span>
                        {report?.notes && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{report.notes.split(":").slice(1).join(":").trim() || report.notes}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(report?.created_at ?? a.last_updated_at), { addSuffix: true })}</p>
                      </td>
                      <td className="p-3">
                        {report?.photo_url && photoUrls[report.photo_url] ? (
                          <button onClick={() => setLightbox(photoUrls[report.photo_url!] ?? null)} aria-label={`View photo for ${a.asset_code}`}>
                            <img src={photoUrls[report.photo_url]} alt="" className="h-14 w-14 rounded-md object-cover" />
                          </button>
                        ) : <span className="text-xs text-muted-foreground">No photo</span>}
                      </td>
                      <td className="p-3">
                        <Button size="tap" variant="success" disabled={resolveM.isPending} onClick={(e) => { e.stopPropagation(); resolveM.mutate(a.id); }}>
                          Mark Resolved by Crew
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="relative h-80 border-t lg:col-span-2 lg:h-auto lg:min-h-[420px] lg:border-l lg:border-t-0">
            <LazyMap assets={crewAssets} selectedId={selectedId} onSelect={(a) => setSelectedId(a.id)} className="absolute inset-0 h-full w-full" />
          </div>
        </div>
      </section>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>Resident photo</DialogTitle>
          {lightbox && <img src={lightbox} alt="Resident report" className="max-h-[75vh] w-full rounded-md object-contain" />}
        </DialogContent>
      </Dialog>
    </main>
  );
}

type Storm = { id: string; title: string; severity: "advisory" | "watch" | "warning"; instructions: string | null; created_at: string } | null;

function StormPanel({ storm, onChange }: { storm: Storm; onChange: () => void }) {
  const { demoArg } = useSession();
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"advisory" | "watch" | "warning">("watch");
  const [instructions, setInstructions] = useState("Clear leaves and trash from the top of your adopted grate before the rain starts. Stay on the curb and never enter moving water.");
  const activate = useServerFn(activateStorm);
  const deactivate = useServerFn(deactivateStorm);
  const reset = useServerFn(resetAdoptedAssets);
  const onErr = (e: Error) => toast.error(e.message);
  const activateM = useMutation({ mutationFn: () => activate({ data: { demoRole: demoArg, title, severity, instructions } }), onSuccess: () => { toast.success("Storm Mode activated · residents now see the alert"); setTitle(""); onChange(); }, onError: onErr });
  const deactivateM = useMutation({ mutationFn: () => deactivate({ data: { demoRole: demoArg } }), onSuccess: () => { toast.success("Storm Mode ended"); onChange(); }, onError: onErr });
  const resetM = useMutation({ mutationFn: () => reset({ data: { demoRole: demoArg } }), onSuccess: (r) => { toast.success(`${r.count} adopted assets reset to Needs Check`); onChange(); }, onError: onErr });

  return (
    <section aria-label="Storm mode" className="rounded-xl border bg-card p-4">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Siren className="h-5 w-5 text-alert" /> Storm Mode Control Panel</h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div className={cn("rounded-lg p-4", storm ? "bg-alert text-alert-foreground" : "bg-muted")}>
          {storm ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide">Active · {storm.severity} · since {formatDistanceToNow(new Date(storm.created_at), { addSuffix: true })}</p>
              <p className="mt-1 font-display text-lg font-bold">{storm.title}</p>
              <p className="mt-1 text-sm">{storm.instructions}</p>
              <Button size="tap" variant="outline" className="mt-3 text-foreground" disabled={deactivateM.isPending} onClick={() => deactivateM.mutate()}>End Storm Event</Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No storm event is active. Residents see no alert banner.</p>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="tap" variant="secondary" className="mt-3 w-full sm:w-auto">
                <RotateCcw className="!size-5" /> Reset All Adopted Assets to “Needs Check”
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset adopted assets?</AlertDialogTitle>
                <AlertDialogDescription>Every adopted asset that is not waiting on a City Crew goes back to “Needs Check” so residents re-verify it for this storm.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetM.mutate()}>Reset assets</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); activateM.mutate(); }}>
          <p className="text-sm font-semibold">{storm ? "Replace with a new storm event" : "Activate a storm event"}</p>
          <div className="space-y-1">
            <Label htmlFor="st">Title</Label>
            <Input id="st" required minLength={3} className="h-12" placeholder="Flash Flood Watch — Oct 14" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Severity</Label>
            <div className="flex gap-2" role="radiogroup">
              {(["advisory", "watch", "warning"] as const).map((s) => (
                <button type="button" key={s} role="radio" aria-checked={severity === s} onClick={() => setSeverity(s)}
                  className={cn("min-h-12 flex-1 rounded-md border-2 text-sm font-semibold capitalize", severity === s ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="si">Resident instructions</Label>
            <Textarea id="si" rows={3} maxLength={1000} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>
          <Button type="submit" size="tap" variant="alert" disabled={activateM.isPending}>Activate Storm Mode</Button>
        </form>
      </div>
    </section>
  );
}
