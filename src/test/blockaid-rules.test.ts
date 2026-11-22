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
