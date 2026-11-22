import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Asset } from "./blockaid";

export const assetsQuery = queryOptions({
  queryKey: ["assets"],
  queryFn: async () => {
    const { data, error } = await supabase.from("assets").select("*").order("asset_code");
    if (error) throw error;
    return data as Asset[];
  },
});

export const activeStormQuery = queryOptions({
  queryKey: ["storm", "active"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("storm_events").select("*").eq("is_active", true)
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

export const openCrewReportsQuery = queryOptions({
  queryKey: ["reports", "open-crew"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("status_reports").select("*").eq("status", "needs_city_crew").eq("resolved_by_city", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const stormClearsQuery = (since: string | null) =>
  queryOptions({
    queryKey: ["reports", "storm-clears", since],
    queryFn: async () => {
      let q = supabase.from("status_reports").select("asset_id", { count: "exact" }).eq("status", "cleared");
      if (since) q = q.gte("created_at", since);
      const { data, error } = await q;
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.asset_id)).size;
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

export const allQueryKeys = [["assets"], ["reports"], ["storm"]] as const;
