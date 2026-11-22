import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

export function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin, user, setDemoRole } = useSession();
  if (isAdmin) return <>{children}</>;
  return (
    <main className="mx-auto w-full max-w-xl flex-1 p-6 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-alert" />
      <h1 className="mt-3 text-2xl font-bold">Public Works staff only</h1>
      <p className="mt-2 text-muted-foreground">
        {user ? "Your account does not have Public Works admin access." : "Switch to the Public Works Admin demo view, or sign in with a city admin account."}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        {!user && <Button size="tap" onClick={() => setDemoRole("admin")}>Use Admin Demo View</Button>}
        <Button size="tap" variant="outline" asChild><Link to="/">Back to map</Link></Button>
      </div>
    </main>
  );
}
