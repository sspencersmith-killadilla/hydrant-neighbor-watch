import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/blockaid/StatusBadge";
import { ReportDialog } from "@/components/blockaid/ReportDialog";
import { assetsQuery } from "@/lib/queries";
import { useServerFn } from "@tanstack/react-start";
import { getMyCheckins } from "@/lib/blockaid.functions";
import { ASSET_TYPE_LABEL, type Asset } from "@/lib/blockaid";
import { useCity, useSession } from "@/lib/session";

export const Route = createFileRoute("/c/$slug/my-assets")({
  head: () => ({
    meta: [
      { title: "My Adopted Assets — BlockAid" },
      { name: "description", content: "Your adopted storm drains, hydrants and sidewalks, with one-tap check-ins." },
      { property: "og:title", content: "My Adopted Assets — BlockAid" },
      { property: "og:description", content: "Track and check in on the city assets you have adopted." },
    ],
  }),
  component: MyAssets,
});

function MyAssets() {
  const { user, demoRole } = useSession();
  const { profile, city, demoArg } = useCity();
  const fetchCheckins = useServerFn(getMyCheckins);
  const { data: assets = [] } = useQuery(assetsQuery(city.id));
  const { data: checkins = 0 } = useQuery({
    queryKey: ["reports", "mine", city.id, profile?.id],
    queryFn: () => fetchCheckins({ data: { demoRole: demoArg, cityId: city.id } }),
    enabled: !!profile,
  });
  const [clearing, setClearing] = useState<Asset | null>(null);
  const mine = profile ? assets.filter((a) => a.adopted_by === profile.id) : [];
  const cleared = mine.filter((a) => a.status === "cleared").length;

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 p-5">
        <h1 className="text-2xl font-bold">My Adopted Assets</h1>
        <p className="mt-2 text-muted-foreground">
          {!user && demoRole === "admin" ? "Switch to Resident View to see a resident's adopted assets." : "Sign in to see the assets you have adopted."}
        </p>
        <Button asChild size="tap" className="mt-4"><Link to="/auth">Sign in</Link></Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">My Adopted Assets</h1>
      <p className="text-sm text-muted-foreground">{profile.full_name}{profile.isDemo && " · demo account"}</p>

      <section aria-label="Your impact" className="mt-5 grid grid-cols-3 gap-3">
        {[
          { n: mine.length, l: "Adopted" },
          { n: cleared, l: "Currently cleared" },
          { n: checkins, l: "Total check-ins" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border bg-card p-4 text-center">
            <p className="font-display text-3xl font-bold">{s.n}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </section>

      {mine.length === 0 ? (
        <div className="mt-6 rounded-xl border bg-card p-6 text-center">
          <p className="font-medium">You haven't adopted anything yet.</p>
          <Button asChild size="tap" className="mt-3"><Link to="/c/$slug" params={{ slug: city.slug }}>Find an asset on the map</Link></Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {mine.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ASSET_TYPE_LABEL[a.asset_type]}</p>
                <p className="font-display text-lg font-bold">{a.asset_code}{a.nickname && <span className="ml-2 font-sans text-sm font-medium text-info">“{a.nickname}”</span>}</p>
                <p className="text-sm">{a.address_label}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <StatusBadge status={a.status} /> Updated {formatDistanceToNow(new Date(a.last_updated_at), { addSuffix: true })}
                </div>
              </div>
              <Button size="tap" variant="success" disabled={a.status === "cleared"} onClick={() => setClearing(a)}>
                <CheckCircle2 className="!size-5" /> {a.status === "cleared" ? "Cleared" : "Mark Cleared"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {clearing && <ReportDialog asset={clearing} mode="cleared" open onOpenChange={(o) => !o && setClearing(null)} />}
    </main>
  );
}
