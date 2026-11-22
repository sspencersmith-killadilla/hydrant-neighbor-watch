import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Award, CloudRain, Megaphone, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { createTeam, getCommunity, setSpotlight, setTeamMembership } from "@/lib/blockaid.functions";
import { BADGES, LBS_PER_CLEARING, TEAM_KINDS, type TeamKind } from "@/lib/community";
import { assetsQuery } from "@/lib/queries";
import { useCity } from "@/lib/session";

export const Route = createFileRoute("/c/$slug/community")({
  head: () => ({
    meta: [
      { title: "Community & Teams — BlockAid" },
      { name: "description", content: "Neighborhood teams, storm-readiness, volunteer badges and city spotlights on BlockAid." },
      { property: "og:title", content: "Community & Teams — BlockAid" },
      { property: "og:description", content: "See how your neighbors are keeping drains, hydrants and sidewalks clear." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Community,
});

function Community() {
  const { city, demoArg, profile, isAdmin } = useCity();
  const qc = useQueryClient();
  const fetchCommunity = useServerFn(getCommunity);
  const key = ["community", city.id, profile?.id ?? "anon"];
  const { data } = useQuery({ queryKey: key, queryFn: () => fetchCommunity({ data: { demoRole: demoArg, cityId: city.id } }) });
  const { data: assets = [] } = useQuery(assetsQuery(city.id));
  const named = assets.filter((a) => a.nickname);
  const refresh = () => qc.invalidateQueries({ queryKey: ["community", city.id] });

  if (!data) return <main className="flex-1 animate-pulse bg-muted" />;
  const { totals } = data;
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 p-4 sm:p-6">
      <header>
        <h1 className="text-3xl font-bold">Community in {city.name}</h1>
        <p className="text-muted-foreground">Neighbors, teams and the difference they're making.</p>
      </header>

      {data.spotlight && (
        <section className="rounded-2xl border-2 border-primary/30 bg-accent p-5 text-accent-foreground">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><Megaphone className="size-4" /> City spotlight</p>
          <h2 className="mt-1 text-xl font-bold">{data.spotlight.title}</h2>
          {data.spotlight.body && <p className="mt-1 whitespace-pre-line">{data.spotlight.body}</p>}
        </section>
      )}
      {isAdmin && <SpotlightEditor initial={data.spotlight} onSaved={refresh} />}

      <section aria-label="Impact" className="space-y-4 rounded-2xl border bg-card p-5">
        <div>
          <div className="flex items-baseline justify-between"><h2 className="text-lg font-bold">Storm-readiness</h2><span className="font-display text-3xl font-bold">{data.readiness}%</span></div>
          <Progress value={data.readiness} className="mt-2 h-3" aria-label="Share of storm drains currently cleared" />
          <p className="mt-1 text-sm text-muted-foreground">Share of {city.name}'s storm drains that are currently marked cleared.</p>
        </div>
        {data.storm && (
          <p className="flex items-start gap-2 rounded-lg bg-info/10 p-3 text-sm font-medium text-info">
            <CloudRain className="mt-0.5 size-4 shrink-0" /> Since “{data.storm.title}” was declared: {data.storm.checkins} check-ins by {data.storm.residents} residents.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { n: `${totals.adopted}/${totals.assets}`, l: "Assets adopted" },
            { n: totals.checkins, l: "Check-ins" },
            { n: totals.volunteers, l: "Volunteers" },
            { n: `≈${totals.debrisLbs} lbs`, l: "Debris kept out of drains" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-secondary p-3 text-center">
              <p className="font-display text-2xl font-bold">{s.n}</p><p className="text-xs text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Debris is an estimate: about {LBS_PER_CLEARING} lbs per cleared check-in.</p>
      </section>

      <MyBadges me={data.me} slug={city.slug} />

      {data.districts.length > 0 && (
        <section aria-label="Neighborhood readiness" className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-bold">Neighborhood readiness</h2>
          <p className="text-sm text-muted-foreground">Share of each neighborhood's storm drains currently cleared.</p>
          <ul className="mt-3 space-y-3">
            {data.districts.map((d) => (
              <li key={d.slug}>
                <div className="flex items-baseline justify-between text-sm">
                  <Link to="/c/$slug" params={{ slug: city.slug }} search={{ district: d.slug }} className="font-semibold underline-offset-2 hover:underline">{d.name}</Link>
                  <span>{d.readiness}% · {d.adopted}/{d.assets} adopted</span>
                </div>
                <Progress value={d.readiness} className="mt-1 h-2" aria-label={`${d.name} readiness`} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Users className="size-5" /> Teams</h2>
        {data.teams.length === 0 && <p className="text-muted-foreground">No teams yet. Start the first one for your block, school or group.</p>}
        <ol className="space-y-3">
          {data.teams.map((t, i) => <TeamRow key={t.id} team={t} rank={i + 1} canJoin={!!profile} onChange={refresh} />)}
        </ol>
        {profile ? <NewTeam onCreated={refresh} /> : <Button asChild size="tap" variant="outline"><Link to="/auth">Sign in to start or join a team</Link></Button>}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold"><Trophy className="size-5" /> Top volunteers</h2>
          {data.leaders.length === 0 ? <p className="mt-2 text-muted-foreground">No check-ins yet.</p> : (
            <ol className="mt-3 space-y-2">
              {data.leaders.map((l, i) => (
                <li key={i} className={`flex items-center justify-between rounded-lg border p-3 ${l.isMe ? "border-primary bg-accent" : "bg-card"}`}>
                  <span><span className="mr-2 font-display font-bold text-muted-foreground">{i + 1}</span>{l.name}{l.isMe && " (you)"}</span>
                  <span className="text-sm font-semibold">{l.checkins} check-ins</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Only first names and last initials are shown.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold">Named assets</h2>
          {named.length === 0 ? <p className="mt-2 text-muted-foreground">Give an asset a nickname when you adopt it and it'll show up here.</p> : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {named.map((a) => <li key={a.id} className="rounded-full border bg-card px-3 py-2 text-sm"><span className="font-semibold text-info">“{a.nickname}”</span> <span className="text-muted-foreground">· {a.address_label}</span></li>)}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

type CommunityData = Awaited<ReturnType<typeof getCommunity>>;

function MyBadges({ me, slug }: { me: CommunityData["me"]; slug: string }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Award className="size-5" /> Badges</h2>
        {me && <Button asChild variant="outline" size="tap"><Link to="/c/$slug/certificate" params={{ slug }}>Print my certificate</Link></Button>}
      </div>
      {!me && <p className="mt-1 text-sm text-muted-foreground">Sign in to start earning badges.</p>}
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BADGES.map((b) => {
          const got = !!me?.badges.includes(b.id);
          return (
            <li key={b.id} className={`rounded-xl border p-3 ${got ? "border-success bg-success/10" : "opacity-60"}`}>
              <p className="font-semibold">{got ? "🏅" : "○"} {b.name}</p>
              <p className="text-sm text-muted-foreground">{b.description}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TeamRow({ team, rank, canJoin, onChange }: { team: CommunityData["teams"][number]; rank: number; canJoin: boolean; onChange: () => void }) {
  const { city, demoArg } = useCity();
  const toggle = useServerFn(setTeamMembership);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await toggle({ data: { demoRole: demoArg, cityId: city.id, teamId: team.id, join: !team.isMine } }); onChange(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <li className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${team.isMine ? "border-primary bg-accent" : "bg-card"}`}>
      <span className="font-display text-2xl font-bold text-muted-foreground">#{rank}</span>
      <div className="flex-1">
        <p className="font-bold">{team.name} <span className="ml-1 text-xs font-medium text-muted-foreground">{TEAM_KINDS[team.kind as TeamKind] ?? team.kind}</span></p>
        {team.description && <p className="text-sm text-muted-foreground">{team.description}</p>}
        <p className="mt-1 text-sm">{team.members} members · {team.adopted} assets adopted · {team.checkins} check-ins</p>
      </div>
      {canJoin && <Button size="tap" variant={team.isMine ? "outline" : "default"} disabled={busy} onClick={go}>{team.isMine ? "Leave team" : "Join team"}</Button>}
    </li>
  );
}

function NewTeam({ onCreated }: { onCreated: () => void }) {
  const { city, demoArg } = useCity();
  const create = useServerFn(createTeam);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<TeamKind>("block_club");
  const [description, setDescription] = useState("");
  if (!open) return <Button size="tap" onClick={() => setOpen(true)}>Start a team</Button>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create({ data: { demoRole: demoArg, cityId: city.id, name, kind, description } });
      toast.success("Team created"); setOpen(false); setName(""); setDescription(""); onCreated();
    } catch (err) { toast.error((err as Error).message); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-4">
      <label className="block text-sm font-medium">Team name<Input className="mt-1 h-12" value={name} onChange={(e) => setName(e.target.value)} placeholder="Oak Street Block Club" required minLength={3} maxLength={60} /></label>
      <label className="block text-sm font-medium">Type
        <select className="mt-1 h-12 w-full rounded-md border bg-background px-3" value={kind} onChange={(e) => setKind(e.target.value as TeamKind)}>
          {Object.entries(TEAM_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">Short description (optional)<Textarea className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={280} /></label>
      <div className="flex gap-2"><Button size="tap" type="submit">Create team</Button><Button size="tap" type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
    </form>
  );
}

function SpotlightEditor({ initial, onSaved }: { initial: CommunityData["spotlight"]; onSaved: () => void }) {
  const { city, demoArg } = useCity();
  const save = useServerFn(setSpotlight);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await save({ data: { demoRole: demoArg, cityId: city.id, title, body } }); toast.success(title ? "Spotlight posted" : "Spotlight removed"); onSaved(); }
    catch (err) { toast.error((err as Error).message); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-dashed bg-card p-4">
      <p className="text-sm font-semibold">Admin: spotlight a volunteer or team of the month (leave the title empty to remove it)</p>
      <Input className="h-12" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Volunteer of the Month: Maria G." maxLength={80} />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Maria cleared 12 drains before last week's storm." maxLength={500} />
      <Button size="tap" type="submit">Save spotlight</Button>
    </form>
  );
}
