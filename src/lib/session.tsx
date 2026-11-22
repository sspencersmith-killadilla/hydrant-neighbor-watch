import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "./blockaid.functions";
import type { DemoRole } from "./blockaid";

interface SessionValue {
  user: User | null;
  authReady: boolean;
  demoRole: DemoRole;
  setDemoRole: (r: DemoRole) => void;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [demoRole, setDemoRoleState] = useState<DemoRole>("resident");

  useEffect(() => {
    const stored = window.localStorage.getItem("blockaid-demo-role");
    if (stored === "admin" || stored === "resident") setDemoRoleState(stored);
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "INITIAL_SESSION")
        setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setDemoRole = (r: DemoRole) => {
    setDemoRoleState(r);
    window.localStorage.setItem("blockaid-demo-role", r);
  };

  return <Ctx.Provider value={{ user, authReady, demoRole, setDemoRole }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}

export interface City {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  center_lat: number;
  center_lng: number;
  is_demo: boolean;
}

interface CityValue {
  city: City;
  /** Passed to server actions; only set in the demo city when nobody is signed in. */
  demoArg: DemoRole | undefined;
  isAdmin: boolean;
  profile: { id: string; full_name: string | null; safety_waiver_accepted: boolean; isDemo: boolean } | null;
  refetchProfile: () => void;
}
const CityCtx = createContext<CityValue | null>(null);

export function CityProvider({ city, children }: { city: City; children: ReactNode }) {
  const { user, demoRole } = useSession();
  const fetchProfile = useServerFn(getMyProfile);
  const demoArg = !user && city.is_demo ? demoRole : undefined;
  const q = useQuery({
    queryKey: ["profile", city.id, user?.id ?? "anon", demoArg],
    queryFn: () => fetchProfile({ data: { demoRole: demoArg, cityId: city.id } }),
  });
  const profile = q.data ?? null;
  const isAdmin = !!profile?.isAdmin;
  return (
    <CityCtx.Provider value={{ city, demoArg, isAdmin, profile, refetchProfile: () => void q.refetch() }}>
      {children}
    </CityCtx.Provider>
  );
}

export function useCity() {
  const v = useContext(CityCtx);
  if (!v) throw new Error("useCity outside CityProvider");
  return v;
}
