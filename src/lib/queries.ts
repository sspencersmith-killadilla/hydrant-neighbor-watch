import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Asset } from "./blockaid";
import type { City } from "./session";

export const citiesQuery = queryOptions({
  queryKey: ["cities"],
  queryFn: async () => {
    const { data, error } = await supabase.from("cities").select("*").order("is_demo", { ascending: false }).order("name");
    if (error) throw error;
    return data as City[];
  },
});

export const cityBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["cities", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("cities").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as City | null;
    },
  });

export const assetsQuery = (cityId: string) =>
  queryOptions({
    queryKey: ["assets", cityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assets").select("*").eq("city_id", cityId).order("asset_code");
      if (error) throw error;
      return data as Asset[];
    },
  });

export const activeStormQuery = (cityId: string) =>
  queryOptions({
    queryKey: ["storm", "active", cityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storm_events").select("*").eq("city_id", cityId).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const reportsForAssetQuery = (assetId: string) =>
  queryOptions({
    queryKey: ["reports", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("status_reports").select("*").eq("asset_id", assetId)
        .order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

export const openCrewReportsQuery = (cityId: string) =>
  queryOptions({
    queryKey: ["reports", "open-crew", cityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("status_reports").select("*, assets!inner(city_id)")
        .eq("assets.city_id", cityId).eq("status", "needs_city_crew").eq("resolved_by_city", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const myCheckinsQuery = (profileId: string | undefined) =>
  queryOptions({
    queryKey: ["reports", "mine", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("status_reports").select("id", { count: "exact", head: true }).eq("reporter_id", profileId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
