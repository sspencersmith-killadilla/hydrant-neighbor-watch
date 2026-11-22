import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Building2, Droplets, MapPin, Server, Siren } from "lucide-react";
import { SiteHeader } from "@/components/blockaid/SiteHeader";
import { SiteFooter } from "@/components/blockaid/SiteFooter";
import { Button } from "@/components/ui/button";
import { citiesQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlockAid — Volunteer storm readiness for every city" },
      { name: "description", content: "Free, open-source platform where residents adopt storm drains, hydrants and sidewalks and Public Works triages reports during severe weather." },
      { property: "og:title", content: "BlockAid — Volunteer storm readiness for every city" },
      { property: "og:description", content: "Start your city on BlockAid in minutes. Free OpenStreetMap maps, no map fees." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Droplets, title: "Adopt-a-Drain", text: "Residents adopt storm drains, fire hydrants and senior-priority sidewalks and check in before storms." },
  { icon: Siren, title: "Storm Mode", text: "Public Works broadcasts alerts, resets every adopted asset, and watches citywide readiness climb." },
  { icon: MapPin, title: "Crew triage", text: "Flags arrive with photos, GPS links and issue types, sorted for dispatch and exportable to 311." },
];

function Landing() {
  const { data: cities = [] } = useQuery(citiesQuery);
  const demo = cities.find((c) => c.is_demo);
  const live = cities.filter((c) => !c.is_demo);
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-highlight">A CivicPlexus app</p>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight md:text-5xl">
                Neighbors keep the drains clear. <span className="text-brand">Crews go where they're needed.</span>
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                BlockAid coordinates resident volunteers who maintain storm drains, hydrants and priority sidewalks, and gives Public Works a live triage dashboard during severe weather.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="tap"><Link to="/start"><Building2 className="!size-5" /> Start your city</Link></Button>
                {demo && (
                  <Button asChild size="tap" variant="outline">
                    <Link to="/c/$slug" params={{ slug: demo.slug }}>Try the demo city <ArrowRight className="!size-5" /></Link>
                  </Button>
                )}
              </div>
            </div>
            <ul className="grid gap-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-4 rounded-xl border bg-background p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand text-primary-foreground"><f.icon className="h-5 w-5" /></span>
                  <div><h2 className="font-bold">{f.title}</h2><p className="text-sm text-muted-foreground">{f.text}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="text-2xl font-bold">Cities on BlockAid</h2>
          {live.length === 0 ? (
            <p className="mt-2 text-muted-foreground">No cities have launched yet. Yours could be first.</p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((c) => (
                <li key={c.id}>
                  <Link to="/c/$slug" params={{ slug: c.slug }} className="flex min-h-16 items-center justify-between rounded-xl border bg-card p-4 hover:border-primary">
                    <span><span className="block font-bold">{c.name}</span>{c.region && <span className="text-sm text-muted-foreground">{c.region}</span>}</span>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-14 md:grid-cols-2">
          <Link to="/guide" className="flex gap-4 rounded-xl border bg-card p-5 hover:border-primary">
            <BookOpen className="h-6 w-6 text-highlight" />
            <span><span className="block font-bold">User guide</span><span className="text-sm text-muted-foreground">For residents and Public Works staff.</span></span>
          </Link>
          <Link to="/self-host" className="flex gap-4 rounded-xl border bg-card p-5 hover:border-primary">
            <Server className="h-6 w-6 text-highlight" />
            <span><span className="block font-bold">Self-hosting guide</span><span className="text-sm text-muted-foreground">Run BlockAid on your own servers.</span></span>
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
