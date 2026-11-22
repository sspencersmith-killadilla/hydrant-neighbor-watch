import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCity, useSession } from "@/lib/session";

export function AdminGate({ children }: { children: ReactNode }) {
  const { user, setDemoRole } = useSession();
  const { isAdmin, city } = useCity();
  if (isAdmin) return <>{children}</>;
  return (
    <main className="mx-auto w-full max-w-xl flex-1 p-6 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-alert" />
      <h1 className="mt-3 text-2xl font-bold">Public Works staff only</h1>
      <p className="mt-2 text-muted-foreground">
        {user
          ? `Your account is not a Public Works admin for ${city.name}. Ask an existing admin to add your email.`
          : city.is_demo
            ? "Switch to the Public Works Admin demo view to explore the dashboard."
            : "Sign in with a city admin account to open the dashboard."}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        {!user && city.is_demo && <Button size="tap" onClick={() => setDemoRole("admin")}>Use Admin Demo View</Button>}
        {!user && !city.is_demo && <Button size="tap" asChild><Link to="/auth">Sign in</Link></Button>}
        <Button size="tap" variant="outline" asChild><Link to="/c/$slug" params={{ slug: city.slug }}>Back to map</Link></Button>
      </div>
    </main>
  );
}
