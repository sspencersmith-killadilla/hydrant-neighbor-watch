import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitReport } from "@/lib/blockaid.functions";
import { useCity } from "@/lib/session";
import { fileToBase64 } from "@/lib/file";
import { CREW_REASONS, DEBRIS_LABEL, type Asset, type CrewReason, type DebrisType } from "@/lib/blockaid";
import { cn } from "@/lib/utils";

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "min-h-12 rounded-full border-2 px-4 text-sm font-semibold transition-colors",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:border-primary",
      )}
    >
      {children}
    </button>
  );
}

export function ReportDialog({
  asset, mode, open, onOpenChange,
}: { asset: Asset; mode: "cleared" | "needs_city_crew"; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { demoArg, city } = useCity();
  const [debris, setDebris] = useState<DebrisType | undefined>();
  const [reason, setReason] = useState<CrewReason | undefined>();
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const qc = useQueryClient();
  const send = useServerFn(submitReport);
  const crew = mode === "needs_city_crew";

  const m = useMutation({
    mutationFn: async () => {
      if (file && file.size > 8 * 1024 * 1024) throw new Error("Photo must be under 8 MB");
      const photo = file ? await fileToBase64(file) : undefined;
      return send({
        data: { demoRole: demoArg, cityId: city.id, assetId: asset.id, status: mode, debrisType: debris, reason, notes: notes || undefined, photo },
      });
    },
    onSuccess: () => {
      toast.success(crew ? `${asset.asset_code} flagged for City Crew` : `${asset.asset_code} marked cleared`);
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      onOpenChange(false);
      setDebris(undefined); setReason(undefined); setNotes(""); setFile(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{crew ? "Flag for City Crew" : "Mark Cleared"} · {asset.asset_code}</DialogTitle>
          <DialogDescription>{asset.address_label}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {crew ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Reason (required)</legend>
              <div className="flex flex-wrap gap-2">
                {CREW_REASONS.map((r) => <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>{r}</Chip>)}
              </div>
            </fieldset>
          ) : (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Debris removed (optional)</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(DEBRIS_LABEL) as DebrisType[]).filter((d) => d !== "structural_damage").map((d) => (
                  <Chip key={d} selected={debris === d} onClick={() => setDebris(debris === d ? undefined : d)}>{DEBRIS_LABEL[d]}</Chip>
                ))}
              </div>
            </fieldset>
          )}
          {crew && (
            <div className="space-y-2">
              <Label htmlFor="notes">Short note</Label>
              <Textarea id="notes" maxLength={500} rows={3} placeholder="What does the crew need to know?" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="photo">Photo {crew ? "(recommended)" : "(optional)"}</Label>
            <label htmlFor="photo" className="flex min-h-12 cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-input px-4 text-sm font-medium hover:border-primary">
              <Camera className="h-5 w-5" /> {file ? file.name : "Take or choose a photo"}
            </label>
            <input id="photo" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          {crew && reason === "Downed Wire/Hazard" && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
              Stay at least 30 feet away from downed wires. If anyone is in danger, call 911 now.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button size="tap" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="tap" variant={crew ? "destructive" : "success"} disabled={m.isPending || (crew && !reason)} onClick={() => m.mutate()}>
            {m.isPending ? "Sending…" : crew ? "Send to City Crew" : "Mark Cleared"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
