import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DueslyLogo } from "@/components/duesly/logo";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Duesly" }, { name: "description", content: "Sign in to your Duesly account." }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast.success("Welcome back to Duesly");
      navigate({ to: "/dashboard" });
    }, 600);
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your collections and dues.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" required defaultValue="admin@ariariamarket.ng" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-emerald hover:underline">Forgot?</Link>
          </div>
          <Input id="password" type="password" required defaultValue="••••••••" />
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : <>Sign in <ArrowRight className="h-4 w-4" /></>}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New to Duesly? <Link to="/signup" className="font-medium text-navy hover:underline">Create an account</Link>
        </p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" type="button" asChild><Link to="/dashboard">Org demo</Link></Button>
          <Button variant="outline" type="button" asChild><Link to="/super-admin">Super-admin demo</Link></Button>
        </div>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-hero p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald/30 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-gold/20 blur-3xl animate-float-slow" />
        <div className="relative">
          <DueslyLogo light />
        </div>
        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">Collections your members can trust.</h2>
          <p className="mt-4 text-white/80">Issue virtual accounts, auto-reconcile every payment, and report with confidence — all in one place.</p>
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <ShieldCheck className="h-8 w-8 text-emerald" />
            <div>
              <p className="text-sm font-semibold">Bank-grade security</p>
              <p className="text-xs text-white/70">Every transaction is encrypted and audit-logged.</p>
            </div>
          </div>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} Duesly Technologies</p>
      </div>
      <div className="flex items-center justify-center bg-background px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <DueslyLogo />
          </div>
          <h1 className="font-display text-3xl font-bold text-navy">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
