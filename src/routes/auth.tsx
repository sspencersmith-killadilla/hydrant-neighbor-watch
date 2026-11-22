import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/blockaid/SiteHeader";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";

function safeNext(v: unknown): string | undefined {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = safeNext(s["next"]);
    return next ? { next } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — BlockAid" },
      { name: "description", content: "Sign in to BlockAid with a secure email link. No password needed." },
      { property: "og:title", content: "Sign in — BlockAid" },
      { property: "og:description", content: "Get a one-tap sign-in link by email." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useSession();
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + (next ?? "/start") } });
    setBusy(false);
    if (error) return void toast.error(error.message);
    setSent(true);
  };

  return (
    <>
    <SiteHeader />
    <main className="mx-auto w-full max-w-md flex-1 p-6">
      <div className="rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-bold">Sign in to BlockAid</h1>
        {user ? (
          <div className="mt-3 space-y-3">
            <p className="text-muted-foreground">You're signed in as {user.email}.</p>
            <a href={next ?? "/start"} className="inline-flex min-h-12 items-center rounded-md bg-primary px-5 font-medium text-primary-foreground">Continue</a>
          </div>
        ) : sent ? (
          <div className="mt-4 flex gap-3 rounded-lg bg-success/10 p-4">
            <MailCheck className="h-6 w-6 shrink-0 text-success" />
            <p className="text-sm">Check <strong>{email}</strong> for a sign-in link. It expires in one hour.</p>
          </div>
        ) : (
          <form onSubmit={send} className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">We'll email you a one-tap sign-in link. No password needed.</p>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" required autoComplete="email" className="h-12 text-base" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" size="tap" className="w-full" disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"}</Button>
            <p className="text-xs text-muted-foreground">Just looking? <Link to="/c/$slug" params={{ slug: "maple-heights-demo" }} className="underline">Open the demo city</Link> — no account needed.</p>
          </form>
        )}
      </div>
    </main>
    </>
  );
}
