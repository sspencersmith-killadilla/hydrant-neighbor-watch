import { describe, expect, it } from "vitest";
import { districtByLabel, districtForPoint, parseDistrictGeojson, pointInBoundary, type Boundary } from "@/lib/districts";

const square: Boundary = { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] };

describe("districts", () => {
  it("puts a point inside a boundary but not inside its hole", () => {
    expect(pointInBoundary(2, 2, square)).toBe(true);
    expect(pointInBoundary(5, 5, square)).toBe(false);
    expect(pointInBoundary(20, 2, square)).toBe(false);
  });
  it("assigns an asset to the district containing it", () => {
    const ds = [{ id: "a", boundary: null }, { id: "b", boundary: square }];
    expect(districtForPoint(1, 1, ds)?.id).toBe("b");
    expect(districtForPoint(50, 50, ds)).toBeNull();
  });
  it("matches a CSV district by name or web address", () => {
    const ds = [{ name: "Oak Ridge", slug: "oak-ridge" }];
    expect(districtByLabel("oak ridge", ds)?.slug).toBe("oak-ridge");
    expect(districtByLabel("oak-ridge", ds)?.slug).toBe("oak-ridge");
    expect(districtByLabel("Elm", ds)).toBeNull();
  });
  it("reads named polygons from GeoJSON and rejects points", () => {
    const r = parseDistrictGeojson(JSON.stringify({ type: "FeatureCollection", features: [
      { type: "Feature", properties: { NAME: "Ward 3" }, geometry: square },
      { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [1, 1] } },
    ] }));
    expect(r.districts.map((d) => d.slug)).toEqual(["ward-3"]);
    expect(r.errors).toHaveLength(1);
  });
});
