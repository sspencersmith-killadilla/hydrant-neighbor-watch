import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { districtByLabel, districtForPoint, type Boundary } from "./districts";
import { DEMO_ADMIN_ID, DEMO_RESIDENT_ID, CREW_REASONS, statusAfterCrewResolution } from "./blockaid";

const demoRole = z.enum(["resident", "admin"]).optional();
const cityId = z.string().uuid();

async function assetInCity(assetId: string, city: string) {
  const admin = await getAdmin();
  const { data } = await admin.from("assets").select("id").eq("id", assetId).eq("city_id", city).maybeSingle();
  if (!data) throw new Error("Asset not found in this city");
}

type Actor = { id: string; isAdmin: boolean; isDemo: boolean } | null;

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Real signed-in user wins; otherwise the demo role is honoured only while demo mode is on. */
async function resolveActor(role: "resident" | "admin" | undefined, cityId?: string): Promise<Actor> {
  const admin = await getAdmin();
  const auth = getRequest()?.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token && token.split(".").length === 3) {
    const { data } = await admin.auth.getUser(token);
    if (data.user) {
      let isAdmin = false;
      if (cityId) {
        const { data: m } = await admin.from("city_members").select("id")
          .eq("city_id", cityId).eq("user_id", data.user.id).eq("role", "city_admin").limit(1);
        isAdmin = !!m?.length;
      }
      // Make sure a profile exists for users created before the trigger.
      await admin.from("profiles").upsert({ id: data.user.id, email: data.user.email ?? null }, { onConflict: "id", ignoreDuplicates: true });
      return { id: data.user.id, isAdmin, isDemo: false };
    }
  }
  if (!role || !cityId) return null;
  const { data: city } = await admin.from("cities").select("is_demo").eq("id", cityId).maybeSingle();
  if (!city?.is_demo) return null;
  const { data: settings } = await admin.from("app_settings").select("demo_mode").eq("id", 1).maybeSingle();
  if (!settings?.demo_mode) return null;
  return role === "admin"
    ? { id: DEMO_ADMIN_ID, isAdmin: true, isDemo: true }
    : { id: DEMO_RESIDENT_ID, isAdmin: false, isDemo: true };
}

async function requireAdmin(role: "resident" | "admin" | undefined, cityId: string) {
  const actor = await resolveActor(role, cityId);
  if (!actor?.isAdmin) throw new Error("Public Works admin access required");
  return actor;
}

export const getMyProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ demoRole, cityId }).parse(d))
  .handler(async ({ data }) => {
    const actor = await resolveActor(data.demoRole, data.cityId);
    if (!actor) return null;
    const admin = await getAdmin();
    const { data: p } = await admin
      .from("profiles")
      .select("id, full_name, email, safety_waiver_accepted")
      .eq("id", actor.id)
      .maybeSingle();
    return p ? { ...p, isAdmin: actor.isAdmin, isDemo: actor.isDemo } : null;
  });

export const adoptAsset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      demoRole,
      cityId,
      assetId: z.string().uuid(),
      nickname: z.string().trim().max(60).optional(),
      acceptWaiver: z.literal(true),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const actor = await resolveActor(data.demoRole, data.cityId);
    if (!actor) throw new Error("Sign in to adopt an asset");
    await assetInCity(data.assetId, data.cityId);
    const admin = await getAdmin();
    await admin.from("profiles").update({ safety_waiver_accepted: true, waiver_accepted_at: new Date().toISOString() })
      .eq("id", actor.id).eq("safety_waiver_accepted", false);
    const { data: updated, error } = await admin
      .from("assets")
      .update({ adopted_by: actor.id, nickname: data.nickname || null, status: "needs_check", last_updated_at: new Date().toISOString() })
      .eq("id", data.assetId)
      .is("adopted_by", null)
      .select("id");
    if (error) throw new Error(error.message);
    if (!updated?.length) throw new Error("This asset was already adopted by another resident");
    return { ok: true };
  });

export const submitReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      demoRole,
      cityId,
      assetId: z.string().uuid(),
      status: z.enum(["cleared", "needs_city_crew"]),
      debrisType: z.enum(["leaves", "trash", "ice_snow", "structural_damage"]).optional(),
      reason: z.enum(CREW_REASONS).optional(),
      notes: z.string().trim().max(500).optional(),
      photo: z.object({ base64: z.string().max(11_000_000), contentType: z.string().regex(/^image\//) }).optional(),
    }).refine((v) => v.status === "cleared" || !!v.reason, { message: "Choose a reason for the crew" })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const actor = await resolveActor(data.demoRole, data.cityId);
    await assetInCity(data.assetId, data.cityId);
    const admin = await getAdmin();
    let photo_url: string | null = null;
    if (data.photo) {
      const bytes = Uint8Array.from(atob(data.photo.base64), (c) => c.charCodeAt(0));
      const ext = data.photo.contentType.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${data.assetId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await admin.storage.from("report-photos").upload(path, bytes, { contentType: data.photo.contentType });
      if (error) throw new Error(`Photo upload failed: ${error.message}`);
      photo_url = path;
    }
    const notes = data.status === "needs_city_crew"
      ? `${data.reason}${data.notes ? `: ${data.notes}` : ""}`
      : data.notes || null;
    const { error } = await admin.from("status_reports").insert({
      asset_id: data.assetId,
      reporter_id: actor?.id ?? null,
      status: data.status,
      debris_type: data.debrisType ?? null,
      notes,
      photo_url,
    });
    if (error) throw new Error(error.message);
    await admin.from("assets").update({ status: data.status, last_updated_at: new Date().toISOString() }).eq("id", data.assetId);
    return { ok: true };
  });

export const resolveTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ demoRole, cityId, assetId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.demoRole, data.cityId);
    await assetInCity(data.assetId, data.cityId);
    const admin = await getAdmin();
    await admin.from("status_reports").update({ resolved_by_city: true })
      .eq("asset_id", data.assetId).eq("status", "needs_city_crew").eq("resolved_by_city", false);
    const { error } = await admin.from("assets")
      .update({ status: statusAfterCrewResolution(), last_updated_at: new Date().toISOString() }).eq("id", data.assetId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const activateStorm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      demoRole,
      cityId,
      title: z.string().trim().min(3).max(120),
      severity: z.enum(["advisory", "watch", "warning"]),
      instructions: z.string().trim().max(1000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.demoRole, data.cityId);
    const admin = await getAdmin();
    await admin.from("storm_events").update({ is_active: false }).eq("city_id", data.cityId).eq("is_active", true);
    const { error } = await admin.from("storm_events").insert({
      city_id: data.cityId, title: data.title, severity: data.severity, instructions: data.instructions, is_active: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deactivateStorm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ demoRole, cityId }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.demoRole, data.cityId);
    const admin = await getAdmin();
    await admin.from("storm_events").update({ is_active: false }).eq("city_id", data.cityId).eq("is_active", true);
    return { ok: true };
  });

export const resetAdoptedAssets = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ demoRole, cityId }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.demoRole, data.cityId);
    const admin = await getAdmin();
    const { data: rows, error } = await admin.from("assets")
      .update({ status: "needs_check", last_updated_at: new Date().toISOString() })
      .eq("city_id", data.cityId).not("adopted_by", "is", null).neq("status", "needs_city_crew").select("id");
    if (error) throw new Error(error.message);
    return { count: rows?.length ?? 0 };
  });

export const importAssets = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      demoRole,
      cityId,
      rows: z.array(z.object({
        asset_code: z.string().min(1).max(40),
        asset_type: z.enum(["storm_drain", "fire_hydrant", "priority_sidewalk"]),
        address_label: z.string().min(1).max(200),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        district: z.string().max(80).optional(),
      })).min(1).max(5000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.demoRole, data.cityId);
    const admin = await getAdmin();
    const [{ data: city }, { data: ds }] = await Promise.all([
      admin.from("cities").select("district_mode").eq("id", data.cityId).single(),
      admin.from("districts").select("id, name, slug, boundary").eq("city_id", data.cityId),
    ]);
    const districts = (ds ?? []).map((d) => ({ ...d, boundary: d.boundary as Boundary | null }));
    const { error } = await admin.from("assets").upsert(
      data.rows.map(({ district, ...r }) => {
        const match = city?.district_mode === "geojson"
          ? districtForPoint(r.lat, r.lng, districts)
          : district ? districtByLabel(district, districts) : null;
        return { ...r, city_id: data.cityId, district_id: match?.id ?? null };
      }),
      { onConflict: "city_id,asset_code" },
    );
    if (error) throw new Error(error.message);
    return { count: data.rows.length };
  });

/** Signed photo links for a city's open crew tickets, keyed by report id. Admins only. */
export const getCrewPhotos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ demoRole, cityId }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.demoRole, data.cityId);
    const admin = await getAdmin();
    const { data: rows } = await admin.from("status_reports").select("id, photo_url, assets!inner(city_id)")
      .eq("assets.city_id", data.cityId).eq("status", "needs_city_crew").eq("resolved_by_city", false)
      .not("photo_url", "is", null);
    const list = (rows ?? []).filter((r) => r.photo_url);
    if (!list.length) return {} as Record<string, string>;
    const { data: signed } = await admin.storage.from("report-photos").createSignedUrls(list.map((r) => r.photo_url!), 3600);
    const byPath = new Map((signed ?? []).map((x) => [x.path, x.signedUrl]));
    const out: Record<string, string> = {};
    for (const r of list) { const u = byPath.get(r.photo_url!); if (u) out[r.id] = u; }
    return out;
  });

export const getMyCheckins = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ demoRole, cityId }).parse(d))
  .handler(async ({ data }) => {
    const actor = await resolveActor(data.demoRole, data.cityId);
    if (!actor) return 0;
    const admin = await getAdmin();
    const { count } = await admin.from("status_reports").select("id, assets!inner(city_id)", { count: "exact", head: true })
      .eq("reporter_id", actor.id).eq("assets.city_id", data.cityId);
    return count ?? 0;
  });

export const createCity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().trim().min(2).max(80),
      region: z.string().trim().max(80).optional(),
      slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/, "Use 3–48 lowercase letters, numbers or dashes"),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      districtMode: z.enum(["named", "geojson"]).default("named"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const actor = await resolveActor(undefined);
    if (!actor || actor.isDemo) throw new Error("Sign in with your email to start a city");
    const admin = await getAdmin();
    const { data: city, error } = await admin.from("cities").insert({
      name: data.name, region: data.region || null, slug: data.slug,
      center_lat: data.lat, center_lng: data.lng, created_by: actor.id, district_mode: data.districtMode,
    }).select("id, slug").single();
    if (error) throw new Error(error.code === "23505" ? "That web address is already taken" : error.message);
    await admin.from("city_members").insert({ city_id: city.id, user_id: actor.id, role: "city_admin" });
    return city;
  });

export const addCityAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ demoRole, cityId, email: z.string().trim().email() }).parse(d))
  .handler(async ({ data }) => {
    const actor = await requireAdmin(data.demoRole, data.cityId);
    if (actor.isDemo) throw new Error("Staff can't be added to the demo city");
    const admin = await getAdmin();
    const { data: p } = await admin.from("profiles").select("id").ilike("email", data.email).maybeSingle();
    if (!p) throw new Error("No BlockAid account uses that email yet. Ask them to sign in once first.");
    await admin.from("city_members").upsert({ city_id: data.cityId, user_id: p.id, role: "city_admin" }, { onConflict: "city_id,user_id,role", ignoreDuplicates: true });
    return { ok: true };
  });

export const getMyCities = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async () => {
    const actor = await resolveActor(undefined);
    if (!actor) return [];
    const admin = await getAdmin();
    const { data } = await admin.from("city_members").select("cities(id, slug, name, region)").eq("user_id", actor.id).eq("role", "city_admin");
    return (data ?? []).map((r) => r.cities).filter((c): c is NonNullable<typeof c> => !!c);
  });

/* ---------- Community: teams, impact, badges, spotlight ---------- */
import { earnedBadges, debrisEstimateLbs, publicName, TEAM_KINDS } from "./community";

export const getCommunity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ demoRole, cityId }).parse(d))
  .handler(async ({ data }) => {
    const actor = await resolveActor(data.demoRole, data.cityId);
    const admin = await getAdmin();
    const [{ data: assets }, { data: reports }, { data: storms }, { data: teams }, { data: city }] = await Promise.all([
      admin.from("assets").select("id, adopted_by, status, asset_type, district_id").eq("city_id", data.cityId),
      admin.from("status_reports").select("reporter_id, status, debris_type, created_at, resolved_by_city, assets!inner(city_id)").eq("assets.city_id", data.cityId),
      admin.from("storm_events").select("title, is_active, created_at").eq("city_id", data.cityId).order("created_at", { ascending: false }),
      admin.from("teams").select("id, name, kind, description, team_members(user_id)").eq("city_id", data.cityId).order("name"),
      admin.from("cities").select("spotlight_title, spotlight_body").eq("id", data.cityId).maybeSingle(),
    ]);
    const { data: dRows } = await admin.from("districts").select("id, name, slug").eq("city_id", data.cityId).order("name");
    const A = assets ?? [], R = reports ?? [], S = storms ?? [], T = teams ?? [];
    const cleared = R.filter((r) => r.status === "cleared");
    const byUser = new Map<string, number>();
    for (const r of R) if (r.reporter_id) byUser.set(r.reporter_id, (byUser.get(r.reporter_id) ?? 0) + 1);
    const topIds = [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const { data: profs } = topIds.length
      ? await admin.from("profiles").select("id, full_name").in("id", topIds.map(([id]) => id))
      : { data: [] as { id: string; full_name: string | null }[] };
    const nameOf = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    const adoptedBy = new Map<string, number>();
    for (const a of A) if (a.adopted_by) adoptedBy.set(a.adopted_by, (adoptedBy.get(a.adopted_by) ?? 0) + 1);
    const active = S.find((s) => s.is_active);
    const sinceStorm = active ? R.filter((r) => r.created_at >= active.created_at) : [];
    const drains = A.filter((a) => a.asset_type === "storm_drain");
    const mineReports = actor ? R.filter((r) => r.reporter_id === actor.id) : [];
    return {
      readiness: drains.length ? Math.round((drains.filter((a) => a.status === "cleared").length / drains.length) * 100) : 0,
      totals: {
        assets: A.length,
        adopted: A.filter((a) => a.adopted_by).length,
        checkins: R.length,
        volunteers: new Set([...A.map((a) => a.adopted_by), ...R.map((r) => r.reporter_id)].filter(Boolean)).size,
        debrisLbs: debrisEstimateLbs(cleared.length),
      },
      storm: active ? { title: active.title, checkins: sinceStorm.length, residents: new Set(sinceStorm.map((r) => r.reporter_id).filter(Boolean)).size } : null,
      leaders: topIds.map(([id, n]) => ({ name: publicName(nameOf.get(id)), checkins: n, isMe: id === actor?.id })),
      teams: T.map((t) => {
        const members = (t.team_members ?? []).map((m) => m.user_id);
        return {
          id: t.id, name: t.name, kind: t.kind, description: t.description, members: members.length,
          checkins: members.reduce((s, u) => s + (byUser.get(u) ?? 0), 0),
          adopted: members.reduce((s, u) => s + (adoptedBy.get(u) ?? 0), 0),
          isMine: !!actor && members.includes(actor.id),
        };
      }).sort((a, b) => b.checkins - a.checkins),
      districts: (dRows ?? []).map((d) => {
        const dd = (assets ?? []).filter((a) => a.district_id === d.id && a.asset_type === "storm_drain");
        const all = (assets ?? []).filter((a) => a.district_id === d.id);
        return { slug: d.slug, name: d.name, assets: all.length, adopted: all.filter((a) => a.adopted_by).length,
          readiness: dd.length ? Math.round((dd.filter((a) => a.status === "cleared").length / dd.length) * 100) : 0 };
      }).sort((a, b) => b.readiness - a.readiness),
      spotlight: city?.spotlight_title ? { title: city.spotlight_title, body: city.spotlight_body } : null,
      me: actor ? {
        checkins: mineReports.length,
        cleared: mineReports.filter((r) => r.status === "cleared").length,
        adopted: adoptedBy.get(actor.id) ?? 0,
        badges: earnedBadges(mineReports, adoptedBy.get(actor.id) ?? 0, S.map((s) => s.created_at)),
        signedIn: !actor.isDemo,
      } : null,
    };
  });

export const createTeam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    demoRole, cityId,
    name: z.string().trim().min(3).max(60),
    kind: z.enum(Object.keys(TEAM_KINDS) as [keyof typeof TEAM_KINDS, ...(keyof typeof TEAM_KINDS)[]]),
    description: z.string().trim().max(280).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const actor = await resolveActor(data.demoRole, data.cityId);
    if (!actor) throw new Error("Sign in to start a team");
    const admin = await getAdmin();
    const { data: team, error } = await admin.from("teams").insert({
      city_id: data.cityId, name: data.name, kind: data.kind, description: data.description || null, created_by: actor.id,
    }).select("id").single();
    if (error) throw new Error(error.code === "23505" ? "A team with that name already exists here" : error.message);
    await admin.from("team_members").insert({ team_id: team.id, user_id: actor.id });
    return { ok: true };
  });

export const setTeamMembership = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ demoRole, cityId, teamId: z.string().uuid(), join: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const actor = await resolveActor(data.demoRole, data.cityId);
    if (!actor) throw new Error("Sign in to join a team");
    const admin = await getAdmin();
    const { data: t } = await admin.from("teams").select("id").eq("id", data.teamId).eq("city_id", data.cityId).maybeSingle();
    if (!t) throw new Error("Team not found in this city");
    const { error } = data.join
      ? await admin.from("team_members").upsert({ team_id: data.teamId, user_id: actor.id }, { onConflict: "team_id,user_id", ignoreDuplicates: true })
      : await admin.from("team_members").delete().eq("team_id", data.teamId).eq("user_id", actor.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setSpotlight = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    demoRole, cityId, title: z.string().trim().max(80), body: z.string().trim().max(500),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.demoRole, data.cityId);
    const admin = await getAdmin();
    const { error } = await admin.from("cities").update({ spotlight_title: data.title || null, spotlight_body: data.body || null }).eq("id", data.cityId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- AI help for describing an issue ---------- */
export const suggestIssueDetails = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    demoRole, cityId, assetId: z.string().uuid(), description: z.string().trim().min(8, "Describe the problem in a few more words").max(1000),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    const { data: asset } = await admin.from("assets").select("asset_type").eq("id", data.assetId).eq("city_id", data.cityId).maybeSingle();
    if (!asset) throw new Error("Asset not found in this city");
    const { triageIssue } = await import("./ai-triage.server");
    return triageIssue({ description: data.description, assetType: asset.asset_type.replace("_", " ") });
  });

async function reassignByBoundary(cityIdValue: string) {
  const admin = await getAdmin();
  const [{ data: ds }, { data: as }] = await Promise.all([
    admin.from("districts").select("id, boundary").eq("city_id", cityIdValue),
    admin.from("assets").select("id, lat, lng, district_id").eq("city_id", cityIdValue),
  ]);
  const districts = (ds ?? []).map((d) => ({ id: d.id, boundary: d.boundary as Boundary | null }));
  const groups = new Map<string | null, string[]>();
  for (const a of as ?? []) {
    const id = districtForPoint(a.lat, a.lng, districts)?.id ?? null;
    if (id === a.district_id) continue;
    groups.set(id, [...(groups.get(id) ?? []), a.id]);
  }
  for (const [id, ids] of groups) await admin.from("assets").update({ district_id: id }).in("id", ids);
}

export const setDistrictMode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ demoRole, cityId, mode: z.enum(["named", "geojson"]) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.demoRole, data.cityId);
    const admin = await getAdmin();
    const { error } = await admin.from("cities").update({ district_mode: data.mode }).eq("id", data.cityId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addNamedDistrict = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    demoRole, cityId, name: z.string().trim().min(2).max(80),
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$/),
    lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.demoRole, data.cityId);
    const admin = await getAdmin();
    const { error } = await admin.from("districts").insert({
      city_id: data.cityId, name: data.name, slug: data.slug, center_lat: data.lat ?? null, center_lng: data.lng ?? null,
    });
    if (error) throw new Error(error.code === "23505" ? "A neighborhood with that name already exists" : error.message);
    return { ok: true };
  });

export const importDistrictBoundaries = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    demoRole, cityId,
    districts: z.array(z.object({
      name: z.string().min(1).max(80), slug: z.string().min(1).max(48),
      center_lat: z.number(), center_lng: z.number(),
      boundary: z.object({ type: z.enum(["Polygon", "MultiPolygon"]), coordinates: z.array(z.any()) }),
    })).min(1).max(500),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.demoRole, data.cityId);
    const admin = await getAdmin();
    const { error } = await admin.from("districts").upsert(
      data.districts.map((d) => ({ ...d, city_id: data.cityId, boundary: d.boundary as never })),
      { onConflict: "city_id,slug" },
    );
    if (error) throw new Error(error.message);
    await admin.from("cities").update({ district_mode: "geojson" }).eq("id", data.cityId);
    await reassignByBoundary(data.cityId);
    return { count: data.districts.length };
  });

export const deleteDistrict = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ demoRole, cityId, districtId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.demoRole, data.cityId);
    const admin = await getAdmin();
    const { error } = await admin.from("districts").delete().eq("id", data.districtId).eq("city_id", data.cityId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
