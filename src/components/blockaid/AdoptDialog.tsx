import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { adoptAsset } from "@/lib/blockaid.functions";
import { useSession } from "@/lib/session";
import type { Asset } from "@/lib/blockaid";

export function AdoptDialog({ asset, open, onOpenChange }: { asset: Asset; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { demoArg, profile, refetchProfile } = useSession();
  const [nickname, setNickname] = useState("");
  const [agree, setAgree] = useState(false);
  const qc = useQueryClient();
  const adopt = useServerFn(adoptAsset);
  const alreadyAccepted = !!profile?.safety_waiver_accepted;
  const m = useMutation({
    mutationFn: () => adopt({ data: { demoRole: demoArg, assetId: asset.id, nickname: nickname || undefined, acceptWaiver: true } }),
    onSuccess: () => {
      toast.success(`You adopted ${asset.asset_code}. Thank you!`);
      qc.invalidateQueries({ queryKey: ["assets"] });
      refetchProfile();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const ok = agree || alreadyAccepted;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adopt {asset.asset_code}</DialogTitle>
          <DialogDescription>{asset.address_label}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nick">Nickname (optional)</Label>
            <Input id="nick" className="h-12" maxLength={60} placeholder="e.g. Drainy McDrainface" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <label className="flex cursor-pointer gap-3 rounded-lg border-2 border-alert bg-alert/10 p-3 text-sm">
            <Checkbox className="mt-0.5 h-6 w-6" checked={ok} disabled={alreadyAccepted} onCheckedChange={(v) => setAgree(v === true)} />
            <span>
              <strong className="block">Safety Waiver (required)</strong>
              I agree to clear debris only from the curb/sidewalk, wear visible clothing, and never enter moving traffic or deep water.
              {alreadyAccepted && <span className="mt-1 block text-xs text-muted-foreground">Accepted on file.</span>}
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button size="tap" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="tap" variant="success" disabled={!ok || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Adopting…" : "Adopt This Asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
