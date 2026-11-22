export interface BadgeReport { status: "cleared" | "needs_city_crew"; debris_type: string | null; created_at: string; resolved_by_city: boolean }
export interface Badge { id: string; name: string; description: string }

export const BADGES: Badge[] = [
  { id: "first_checkin", name: "First Check-in", description: "Submitted your first check-in." },
  { id: "storm_sentinel", name: "Storm Sentinel", description: "Cleared an asset within 6 hours of a storm alert." },
  { id: "autumn_veteran", name: "Autumn Veteran", description: "Completed 5 or more leaf cleanouts." },
  { id: "guardian_of_three", name: "Guardian of Three", description: "Looks after 3 or more assets." },
  { id: "sharp_eye", name: "Sharp Eye", description: "Flagged a problem that the city crew fixed." },
];

export const LBS_PER_CLEARING = 5;
const SIX_HOURS = 6 * 3600 * 1000;

export function earnedBadges(reports: BadgeReport[], adoptedCount: number, stormStarts: string[]): string[] {
  const out: string[] = [];
  const cleared = reports.filter((r) => r.status === "cleared");
  if (reports.length >= 1) out.push("first_checkin");
  const starts = stormStarts.map((s) => new Date(s).getTime());
  if (cleared.some((r) => { const t = new Date(r.created_at).getTime(); return starts.some((s) => t >= s && t - s <= SIX_HOURS); }))
    out.push("storm_sentinel");
  if (cleared.filter((r) => r.debris_type === "leaves").length >= 5) out.push("autumn_veteran");
  if (adoptedCount >= 3) out.push("guardian_of_three");
  if (reports.some((r) => r.status === "needs_city_crew" && r.resolved_by_city)) out.push("sharp_eye");
  return out;
}

export function debrisEstimateLbs(clearedCount: number): number {
  return clearedCount * LBS_PER_CLEARING;
}

/** "Jane Smith" -> "Jane S."; blank names stay anonymous. */
export function publicName(full: string | null | undefined): string {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A neighbor";
  return parts.length === 1 ? parts[0]! : `${parts[0]} ${parts[parts.length - 1]![0]}.`;
}

export const TEAM_KINDS = { block_club: "Block club", school: "School", scouts: "Scout troop", business: "Local business", association: "Neighborhood association", other: "Other group" } as const;
export type TeamKind = keyof typeof TEAM_KINDS;
