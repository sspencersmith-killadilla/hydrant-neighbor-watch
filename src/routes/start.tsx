import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, Search } from "lucide-react";
import { SiteHeader } from "@/components/blockaid/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCity, getMyCities } from "@/lib/blockaid.functions";
import { slugify } from "@/lib/blockaid";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start your city — BlockAid" },
      { name: "description", content: "Launch BlockAid for your city or neighborhood in minutes. You become its Public Works admin." },
      { property: "og:title", content: "Start your city — BlockAid" },
      { property: "og:description", content: "Create a BlockAid city, import your infrastructure, and invite residents." },
    ],
  }),
  component: StartCity,
});

type Place = { display_name: string; lat: string; lon: string };

function StartCity() {
  const { user, authReady } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [districtMode, setDistrictMode] = useState<"named" | "geojson">("named");
  const [center, setCenter] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const create = useServerFn(createCity);
  const mine = useServerFn(getMyCities);
  const { data: myCities = [] } = useQuery({ queryKey: ["my-cities", user?.id], queryFn: () => mine({ data: {} }), enabled: !!user });

  const search = async () => {
    if (!query.trim()) return;
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`, {
      headers: { "Accept-Language": "en" },
    });
    const list = (await r.json()) as Place[];
    setPlaces(list);
    if (!list.length) toast.error("No matching place found");
  };

  const m = useMutation({
    mutationFn: () =>
      create({ data: { name, region: region || undefined, slug, lat: center!.lat, lng: center!.lng, districtMode } }),
    onSuccess: (c) => {
      toast.success(`${name} is live on BlockAid`);
      qc.invalidateQueries({ queryKey: ["cities"] });
      navigate({ to: "/c/$slug/admin/data", params: { slug: c.slug } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 p-5">
        <h1 className="text-3xl font-extrabold">Start your city</h1>
        <p className="mt-2 text-muted-foreground">
          Create a BlockAid space for your city, town or neighborhood. You become its first Public Works admin, and can add colleagues later.
        </p>

        {authReady && !user ? (
          <div className="mt-6 rounded-xl border bg-card p-6">
            <p className="font-semibold">Sign in first</p>
            <p className="mt-1 text-sm text-muted-foreground">We'll email you a one-tap link. Your email becomes the city's admin account.</p>
            <Button asChild size="tap" className="mt-4"><Link to="/auth" search={{ next: "/start" }}>Sign in to continue</Link></Button>
          </div>
        ) : (
          <form className="mt-6 space-y-5 rounded-xl border bg-card p-6" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
            <div className="space-y-2">
              <Label htmlFor="name">City or organization name</Label>
              <Input id="name" required minLength={2} maxLength={80} className="h-12" placeholder="City of Riverton"
                value={name} onChange={(e) => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">State or region (optional)</Label>
              <Input id="region" maxLength={80} className="h-12" placeholder="Iowa" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Web address</Label>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">…/c/</span>
                <Input id="slug" required pattern="[a-z0-9][a-z0-9-]{1,46}[a-z0-9]" className="h-12"
                  value={slug} onChange={(e) => { setSlugEdited(true); setSlug(slugify(e.target.value)); }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="q">Where is it? (centers the map)</Label>
              <div className="flex gap-2">
                <Input id="q" className="h-12" placeholder="Riverton, IA" value={query} onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(); } }} />
                <Button type="button" size="tap" variant="outline" onClick={() => void search()}><Search className="!size-5" /> Find</Button>
              </div>
              {places.length > 0 && !center && (
                <ul className="divide-y rounded-md border">
                  {places.map((p) => (
                    <li key={p.lat + p.lon}>
                      <button type="button" className="min-h-12 w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                        onClick={() => setCenter({ lat: Number(p.lat), lng: Number(p.lon), label: p.display_name })}>
                        {p.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {center && (
                <p className="rounded-md bg-accent p-3 text-sm text-accent-foreground">
                  {center.label} <button type="button" className="ml-2 font-semibold underline" onClick={() => setCenter(null)}>Change</button>
                </p>
              )}
              <p className="text-xs text-muted-foreground">Place search by OpenStreetMap Nominatim.</p>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">How will you set up neighborhoods?</legend>
              {([
                ["named", "Simple names", "Type neighborhood names (like \u201cWard 3\u201d) and tag assets with a district column in your spreadsheet."],
                ["geojson", "Boundary map file", "Upload a GeoJSON file of neighborhood shapes from your GIS team. Assets are placed automatically."],
              ] as const).map(([v, label, help]) => (
                <label key={v} className="flex min-h-12 cursor-pointer gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <input type="radio" name="districtMode" className="mt-1" checked={districtMode === v} onChange={() => setDistrictMode(v)} />
                  <span><span className="block font-medium">{label}</span><span className="block text-sm text-muted-foreground">{help}</span></span>
                </label>
              ))}
              <p className="text-xs text-muted-foreground">You can change this later on the City Data page.</p>
            </fieldset>
            <Button type="submit" size="tap" className="w-full" disabled={!center || !user || m.isPending}>
              {m.isPending ? "Creating…" : "Create city"} <ArrowRight className="!size-5" />
            </Button>
          </form>
        )}

        {myCities.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold">Cities you manage</h2>
            <ul className="mt-2 space-y-2">
              {myCities.map((c) => (
                <li key={c.id}>
                  <Link to="/c/$slug/admin" params={{ slug: c.slug }} className="flex min-h-12 items-center justify-between rounded-lg border bg-card px-4 hover:border-primary">
                    {c.name} <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
