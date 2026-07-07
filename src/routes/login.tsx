import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DueslyLogo } from "@/components/duesly/logo";
import { ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { loginUser } from "@/lib/db-actions";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Duesly" }, { name: "description", content: "Sign in to your Duesly account." }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Pre-fill email if returned from forgot-password reset flow
  useEffect(() => {
    if (search?.reset_email) {
      setEmail(search.reset_email);
      toast.info("Input your new password to sign in");
    }
  }, [search]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginUser({ data: { email, password } });
      if (res.success && res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        toast.success(`Welcome back, ${res.user.name}!`);
        
        if (res.user.role === "super-admin") {
          navigate({ to: "/super-admin" });
        } else if (res.user.role === "vendor") {
          navigate({ to: "/vendor-portal" });
        } else {
          navigate({ to: "/dashboard" });
        }
      } else {
        toast.error(res.error || "Invalid credentials");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your collections and dues.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input 
            id="email" 
            type="email" 
            required 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="e.g. chuksy3@gmail.com" 
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-emerald hover:underline">Forgot?</Link>
          </div>
          <div className="relative">
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy cursor-pointer flex items-center justify-center"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : <>Sign in <ArrowRight className="h-4 w-4" /></>}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New to Duesly? <Link to="/signup" className="font-medium text-navy hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-hero p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative">
          <DueslyLogo light />
        </div>
        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">Collections your members can trust.</h2>
          <p className="mt-4 text-white/80">Issue dedicated account numbers, auto-reconcile every payment, and report with confidence — all in one place.</p>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} Duesly Pay Technologies</p>
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
