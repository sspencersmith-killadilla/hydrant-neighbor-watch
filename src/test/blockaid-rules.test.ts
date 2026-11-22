import { describe, expect, it } from "vitest";
import { parseAssetCsv, readinessPercent, statusAfterCrewResolution, filterAssets } from "@/lib/blockaid";

describe("BlockAid rules", () => {
  it("readiness counts only adopted storm drains", () => {
    const pct = readinessPercent([
      { asset_type: "storm_drain", status: "cleared", adopted_by: "a" },
      { asset_type: "storm_drain", status: "needs_check", adopted_by: "a" },
      { asset_type: "storm_drain", status: "cleared", adopted_by: null },
      { asset_type: "fire_hydrant", status: "cleared", adopted_by: "a" },
    ]);
    expect(pct).toBe(50);
  });

  it("resolving a crew ticket returns the asset to cleared", () => {
    expect(statusAfterCrewResolution()).toBe("cleared");
  });

  it("CSV import reports invalid rows instead of skipping them", () => {
    const { rows, errors } = parseAssetCsv(
      "asset_code,asset_type,address_label,lat,lng\nSD-1,storm_drain,1 Main St,41.5,-93.6\nX-2,manhole,2 Main St,41.5,-93.6\n",
    );
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([{ line: 3, message: 'Invalid asset_type "manhole"' }]);
  });

  it("CSV import rejects files missing required columns", () => {
    expect(parseAssetCsv("asset_code,lat\nSD-1,41").errors[0]?.message).toContain("asset_type");
  });

  it("Needs Crew filter shows only flagged assets", () => {
    const r = filterAssets([{ asset_type: "storm_drain", status: "needs_city_crew" }, { asset_type: "storm_drain", status: "cleared" }], "needs_crew");
    expect(r).toHaveLength(1);
  });
});

import { slugify } from "@/lib/blockaid";
describe("City web address", () => {
  it("turns a city name into a lowercase dashed address", () => {
    expect(slugify("City of Riverton, IA")).toBe("city-of-riverton-ia");
  });
});

import { earnedBadges, debrisEstimateLbs, publicName } from "@/lib/community";
describe("Community recognition", () => {
  const r = (status: "cleared" | "needs_city_crew", created_at: string, debris_type: string | null = null, resolved_by_city = false) => ({ status, created_at, debris_type, resolved_by_city });
  it("Storm Sentinel needs a clearing within 6 hours after a storm alert", () => {
    expect(earnedBadges([r("cleared", "2026-01-01T05:00:00Z")], 0, ["2026-01-01T00:00:00Z"])).toContain("storm_sentinel");
    expect(earnedBadges([r("cleared", "2026-01-01T07:00:00Z")], 0, ["2026-01-01T00:00:00Z"])).not.toContain("storm_sentinel");
  });
  it("Autumn Veteran needs 5 leaf cleanouts", () => {
    const four = Array.from({ length: 4 }, () => r("cleared", "2026-01-01T00:00:00Z", "leaves"));
    expect(earnedBadges(four, 0, [])).not.toContain("autumn_veteran");
    expect(earnedBadges([...four, r("cleared", "2026-01-01T00:00:00Z", "leaves")], 0, [])).toContain("autumn_veteran");
  });
  it("Guardian of Three needs 3 adopted assets", () => {
    expect(earnedBadges([], 2, [])).not.toContain("guardian_of_three");
    expect(earnedBadges([], 3, [])).toContain("guardian_of_three");
  });
  it("Sharp Eye needs a crew flag the city resolved", () => {
    expect(earnedBadges([r("needs_city_crew", "2026-01-01T00:00:00Z", null, false)], 0, [])).not.toContain("sharp_eye");
    expect(earnedBadges([r("needs_city_crew", "2026-01-01T00:00:00Z", null, true)], 0, [])).toContain("sharp_eye");
  });
  it("debris estimate is 5 lbs per clearing and names show last initial only", () => {
    expect(debrisEstimateLbs(3)).toBe(15);
    expect(publicName("Jane Q Smith")).toBe("Jane S.");
    expect(publicName(null)).toBe("A neighbor");
  });
});
