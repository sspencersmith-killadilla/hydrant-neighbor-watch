import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/blockaid/BrandMark";
import { getCommunity } from "@/lib/blockaid.functions";
import { BADGES, debrisEstimateLbs } from "@/lib/community";
import { useCity } from "@/lib/session";

export const Route = createFileRoute("/c/$slug/certificate")({
  head: () => ({
    meta: [
      { title: "Volunteer Certificate — BlockAid" },
      { name: "description", content: "A printable certificate recognizing your BlockAid neighborhood service." },
      { property: "og:title", content: "Volunteer Certificate — BlockAid" },
      { property: "og:description", content: "Recognizing residents who keep their block storm-ready." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Certificate,
});

function Certificate() {
  const { city, demoArg, profile } = useCity();
  const fetchCommunity = useServerFn(getCommunity);
  const { data } = useQuery({ queryKey: ["community", city.id, profile?.id ?? "anon"], queryFn: () => fetchCommunity({ data: { demoRole: demoArg, cityId: city.id } }) });
  if (!profile || !data?.me)
    return <main className="mx-auto max-w-md flex-1 p-6 text-center"><p>Sign in to print your certificate.</p><Button asChild size="tap" className="mt-4"><Link to="/auth">Sign in</Link></Button></main>;
  const me = data.me;
  const badges = BADGES.filter((b) => me.badges.includes(b.id));
  return (
    <main className="flex-1 p-4 sm:p-8">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end print:hidden">
        <Button size="tap" onClick={() => window.print()}><Printer className="!size-5" /> Print</Button>
      </div>
      <article className="mx-auto max-w-3xl rounded-2xl border-8 border-double border-primary bg-card p-8 text-center sm:p-12">
        <div className="flex justify-center"><BrandMark /></div>
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Certificate of Neighborhood Service</p>
        <h1 className="mt-6 font-display text-4xl font-extrabold">{profile.full_name || "BlockAid Volunteer"}</h1>
        <p className="mt-4 text-lg">has helped keep {city.name} safe and storm-ready by caring for local storm drains, hydrants and sidewalks.</p>
        <dl className="mt-8 grid grid-cols-3 gap-4">
          <div><dt className="text-xs text-muted-foreground">Assets adopted</dt><dd className="font-display text-3xl font-bold">{me.adopted}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Check-ins</dt><dd className="font-display text-3xl font-bold">{me.checkins}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Debris cleared (est.)</dt><dd className="font-display text-3xl font-bold">≈{debrisEstimateLbs(me.cleared)} lbs</dd></div>
        </dl>
        {badges.length > 0 && <p className="mt-6 font-medium">Badges earned: {badges.map((b) => b.name).join(" · ")}</p>}
        <p className="mt-10 text-sm text-muted-foreground">Issued {new Date().toLocaleDateString()} · BlockAid · A CivicPlexus project</p>
      </article>
    </main>
  );
}
