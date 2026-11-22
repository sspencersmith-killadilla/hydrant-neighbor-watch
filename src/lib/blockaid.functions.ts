import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
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
      })).min(1).max(5000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.demoRole, data.cityId);
    const admin = await getAdmin();
    const { error } = await admin.from("assets").upsert(
      data.rows.map((r) => ({ ...r, city_id: data.cityId })),
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
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const actor = await resolveActor(undefined);
    if (!actor || actor.isDemo) throw new Error("Sign in with your email to start a city");
    const admin = await getAdmin();
    const { data: city, error } = await admin.from("cities").insert({
      name: data.name, region: data.region || null, slug: data.slug,
      center_lat: data.lat, center_lng: data.lng, created_by: actor.id,
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
