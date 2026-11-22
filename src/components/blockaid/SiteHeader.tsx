import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Droplets, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { user, demoRole, setDemoRole, isAdmin } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const switchRole = (r: "resident" | "admin") => {
    setDemoRole(r);
    navigate({ to: r === "admin" ? "/admin" : "/" });
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const navLink = "inline-flex min-h-12 items-center rounded-md px-3 text-sm font-medium text-header-foreground/80 hover:bg-header-foreground/10 hover:text-header-foreground";
  const active = { className: "bg-header-foreground/15 text-header-foreground" };

  return (
    <header className="sticky top-0 z-40 bg-header text-header-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-1 sm:px-5">
        <Link to="/" className="mr-2 flex min-h-12 items-center gap-2 font-display text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-success"><Droplets className="h-5 w-5" /></span>
          BlockAid
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1" aria-label="Main">
          {isAdmin ? (
            <>
              <Link to="/admin" activeOptions={{ exact: true }} activeProps={active} className={navLink}>Dispatch</Link>
              <Link to="/admin/data" activeProps={active} className={navLink}>City Data</Link>
              <Link to="/" activeOptions={{ exact: true }} activeProps={active} className={navLink}>Map</Link>
            </>
          ) : (
            <>
              <Link to="/" activeOptions={{ exact: true }} activeProps={active} className={navLink}>Map</Link>
              <Link to="/my-assets" activeProps={active} className={navLink}>My Assets</Link>
            </>
          )}
        </nav>
        {!user && (
          <div role="group" aria-label="Demo role switcher" className="flex items-center gap-1 rounded-lg bg-header-foreground/10 p-1 text-xs">
            <span className="hidden px-2 font-semibold uppercase tracking-wide text-header-foreground/60 md:inline">Demo</span>
            {(["resident", "admin"] as const).map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                aria-pressed={demoRole === r}
                className={cn(
                  "min-h-10 rounded-md px-3 font-semibold transition-colors",
                  demoRole === r ? "bg-card text-card-foreground" : "text-header-foreground/80 hover:text-header-foreground",
                )}
              >
                {r === "resident" ? "Resident View" : "Public Works Admin"}
              </button>
            ))}
          </div>
        )}
        {user ? (
          <button onClick={signOut} className={navLink} title={user.email ?? ""}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </button>
        ) : (
          <Link to="/auth" className={navLink}>Sign in</Link>
        )}
      </div>
    </header>
  );
}
