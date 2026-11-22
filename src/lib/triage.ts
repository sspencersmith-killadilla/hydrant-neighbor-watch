const SEVERITY: Record<string, number> = {
  "Downed Wire/Hazard": 4,
  "Damaged Infrastructure": 3,
  "Standing Water": 2,
  "Clogged Grate": 1,
};
export function issueType(notes: string | null | undefined): string {
  const head = (notes ?? "").split(":")[0]?.trim() ?? "";
  return head in SEVERITY ? head : "Reported issue";
}
export function issueSeverity(notes: string | null | undefined): number {
  return SEVERITY[issueType(notes)] ?? 0;
}
