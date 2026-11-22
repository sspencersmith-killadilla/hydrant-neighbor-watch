import { useQuery } from "@tanstack/react-query";
import { CloudRainWind } from "lucide-react";
import { activeStormQuery, assetsQuery } from "@/lib/queries";
import { readinessPercent } from "@/lib/blockaid";
import { useCity } from "@/lib/session";
import { cn } from "@/lib/utils";

export function StormBanner() {
  const { city } = useCity();
  const { data: storm } = useQuery(activeStormQuery(city.id));
  const { data: assets = [] } = useQuery(assetsQuery(city.id));
  if (!storm) return null;
  const pct = readinessPercent(assets);
  const warning = storm.severity === "warning";
  return (
    <section
      role="alert"
      className={cn("border-b-4", warning ? "bg-destructive text-destructive-foreground border-destructive" : "bg-alert text-alert-foreground border-alert")}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-5 md:flex-row md:items-center">
        <div className="flex flex-1 gap-3">
          <CloudRainWind className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
          <div>
            <p className="font-display text-base font-bold">
              <span className="mr-2 rounded bg-card/20 px-1.5 py-0.5 text-xs uppercase tracking-wide">{storm.severity}</span>
              {storm.title}
            </p>
            {storm.instructions && <p className="mt-1 text-sm opacity-95">{storm.instructions}</p>}
          </div>
        </div>
        <div className="w-full md:w-72">
          <div className="flex justify-between text-sm font-semibold">
            <span>Citywide readiness</span><span>{pct}%</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-card/30" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-card transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs opacity-90">{pct}% of adopted drains cleared ahead of storm</p>
        </div>
      </div>
    </section>
  );
}
