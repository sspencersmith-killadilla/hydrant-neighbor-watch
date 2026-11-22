import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, HeartHandshake, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { AdoptDialog } from "./AdoptDialog";
import { ReportDialog } from "./ReportDialog";
import { reportsForAssetQuery } from "@/lib/queries";
import { ASSET_TYPE_LABEL, type Asset } from "@/lib/blockaid";
import { useCity } from "@/lib/session";

export function AssetPanel({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const { profile } = useCity();
  const [adoptOpen, setAdoptOpen] = useState(false);
  const [report, setReport] = useState<"cleared" | "needs_city_crew" | null>(null);
  const { data: reports = [] } = useQuery(reportsForAssetQuery(asset.id));
  const mine = !!profile && asset.adopted_by === profile.id;
  const unadopted = !asset.adopted_by;
  const lastCheck = reports[0]?.created_at ?? asset.last_updated_at;

  return (
    <aside
      aria-label={`Details for ${asset.asset_code}`}
      className="absolute inset-x-0 bottom-0 z-[500] max-h-[75%] overflow-y-auto rounded-t-2xl border-t bg-card p-5 shadow-2xl md:inset-y-3 md:left-auto md:right-3 md:max-h-none md:w-96 md:rounded-2xl md:border"
    >
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border md:hidden" aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ASSET_TYPE_LABEL[asset.asset_type]}</p>
          <h2 className="text-2xl font-bold">{asset.asset_code}</h2>
          {asset.nickname && <p className="font-medium text-info">“{asset.nickname}”</p>}
        </div>
        <Button variant="ghost" size="tap-icon" onClick={onClose} aria-label="Close details"><X className="!size-6" /></Button>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div><dt className="text-muted-foreground">Address</dt><dd className="font-medium">{asset.address_label}</dd></div>
        <div><dt className="text-muted-foreground">Current status</dt><dd className="mt-1"><StatusBadge status={asset.status} /></dd></div>
        <div><dt className="text-muted-foreground">Last checked</dt><dd className="font-medium">{formatDistanceToNow(new Date(lastCheck), { addSuffix: true })}</dd></div>
        {mine && <div className="rounded-md bg-info/10 p-2 font-medium text-info">You adopted this asset</div>}
      </dl>

      <div className="mt-5 space-y-3">
        {unadopted && (
          <Button size="tap" className="w-full" onClick={() => setAdoptOpen(true)}>
            <HeartHandshake className="!size-5" /> Adopt This Asset
          </Button>
        )}
        <div className="grid grid-cols-1 gap-3">
          <Button size="tap" variant="success" className="w-full" onClick={() => setReport("cleared")}>
            <CheckCircle2 className="!size-5" /> Mark Cleared
          </Button>
          <Button size="tap" variant="destructive" className="w-full" onClick={() => setReport("needs_city_crew")}>
            <AlertTriangle className="!size-5" /> Flag for City Crew
          </Button>
        </div>
        {unadopted && <p className="text-xs text-muted-foreground">You can report on any asset, even without adopting it.</p>}
      </div>

      {reports.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">Recent activity</h3>
          <ul className="mt-2 space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-md border p-2 text-xs">
                <span className="font-semibold">{r.status === "cleared" ? "Cleared" : r.resolved_by_city ? "Crew ticket · resolved" : "Crew ticket · open"}</span>
                <span className="text-muted-foreground"> · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                {r.notes && <p className="mt-1 text-muted-foreground">{r.notes}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AdoptDialog asset={asset} open={adoptOpen} onOpenChange={setAdoptOpen} />
      {report && <ReportDialog asset={asset} mode={report} open onOpenChange={(o) => !o && setReport(null)} />}
    </aside>
  );
}
