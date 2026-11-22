import { STATUS_LABEL, type AssetStatus } from "@/lib/blockaid";
import { cn } from "@/lib/utils";

const cls: Record<AssetStatus, string> = {
  unassigned: "bg-unadopted text-primary-foreground",
  needs_check: "bg-info text-info-foreground",
  cleared: "bg-success text-success-foreground",
  needs_city_crew: "bg-destructive text-destructive-foreground",
};

export function StatusBadge({ status, className }: { status: AssetStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", cls[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}
