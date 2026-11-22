import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "./blockaid.functions";
import type { DemoRole } from "./blockaid";

interface SessionValue {
  user: User | null;
  demoRole: DemoRole;
  setDemoRole: (r: DemoRole) => void;
  /** Passed to server actions; only used when nobody is signed in. */
  demoArg: DemoRole | undefined;
  isAdmin: boolean;
  profile: { id: string; full_name: string | null; safety_waiver_accepted: boolean; isDemo: boolean } | null;
  refetchProfile: () => void;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [demoRole, setDemoRoleState] = useState<DemoRole>("resident");
  const fetchProfile = useServerFn(getMyProfile);

  useEffect(() => {
    const stored = window.localStorage.getItem("blockaid-demo-role");
    if (stored === "admin" || stored === "resident") setDemoRoleState(stored);
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
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

  const demoArg = user ? undefined : demoRole;
  const profileQ = useQuery({
    queryKey: ["profile", user?.id ?? "demo", demoArg],
    queryFn: () => fetchProfile({ data: { demoRole: demoArg } }),
  });
  const profile = profileQ.data ?? null;
  const isAdmin = user ? !!profile?.isAdmin : demoRole === "admin";

  return (
    <Ctx.Provider value={{ user, demoRole, setDemoRole, demoArg, isAdmin, profile, refetchProfile: () => void profileQ.refetch() }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}
