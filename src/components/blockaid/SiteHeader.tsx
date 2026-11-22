import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, type City } from "@/lib/session";
import { BrandMark } from "./BrandMark";
import { cn } from "@/lib/utils";

const navLink =
  "inline-flex min-h-12 items-center rounded-md px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground";
const active = { className: "bg-secondary text-foreground" };

export function SiteHeader({ city, isAdmin = false }: { city?: City; isAdmin?: boolean }) {
  const { user, demoRole, setDemoRole } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const switchRole = (r: "resident" | "admin") => {
    if (!city) return;
    setDemoRole(r);
    navigate({ to: r === "admin" ? "/c/$slug/admin" : "/c/$slug", params: { slug: city.slug } });
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-header text-header-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-1 sm:px-5">
        <Link to="/" className="mr-1 flex min-h-12 items-center gap-2">
          <BrandMark />
          <span className="font-display text-lg font-extrabold tracking-tight">BlockAid</span>
        </Link>
        {city && (
          <span className="mr-2 hidden max-w-48 truncate rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground sm:inline">
            {city.name}
          </span>
        )}
        <nav className="flex flex-1 flex-wrap items-center gap-1" aria-label="Main">
          {city ? (
            <>
              <Link to="/c/$slug" params={{ slug: city.slug }} activeOptions={{ exact: true }} activeProps={active} className={navLink}>Map</Link>
              {isAdmin ? (
                <>
                  <Link to="/c/$slug/admin" params={{ slug: city.slug }} activeOptions={{ exact: true }} activeProps={active} className={navLink}>Dispatch</Link>
                  <Link to="/c/$slug/admin/data" params={{ slug: city.slug }} activeProps={active} className={navLink}>City Data</Link>
                </>
              ) : (
                <Link to="/c/$slug/my-assets" params={{ slug: city.slug }} activeProps={active} className={navLink}>My Assets</Link>
              )}
            </>
          ) : (
            <>
              <Link to="/start" activeProps={active} className={navLink}>Start a city</Link>
              <Link to="/guide" activeProps={active} className={navLink}>Guide</Link>
              <Link to="/self-host" activeProps={active} className={navLink}>Self-host</Link>
            </>
          )}
        </nav>
        {city?.is_demo && !user && (
          <div role="group" aria-label="Demo role switcher" className="flex items-center gap-1 rounded-lg bg-secondary p-1 text-xs">
            <span className="hidden px-2 font-semibold uppercase tracking-wide text-muted-foreground md:inline">Demo</span>
            {(["resident", "admin"] as const).map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                aria-pressed={demoRole === r}
                className={cn(
                  "min-h-10 rounded-md px-3 font-semibold transition-colors",
                  demoRole === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
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
