import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — Duesly" }, { name: "description", content: "Onboard your association onto Duesly in minutes." }] }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast.success("Account created — welcome to Duesly!");
      navigate({ to: "/dashboard" });
    }, 700);
  };
  return (
    <AuthShell title="Get your association onboard" subtitle="Set up Duesly in minutes. No card required.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="fn">First name</Label>
            <Input id="fn" required defaultValue="Adaeze" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ln">Last name</Label>
            <Input id="ln" required defaultValue="Okeke" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org">Organization name</Label>
          <Input id="org" required placeholder="e.g. Ariaria Market Association" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" required placeholder="you@association.org" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Create password</Label>
          <Input id="password" type="password" required />
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : <>Create account <ArrowRight className="h-4 w-4" /></>}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to Duesly's Terms and Privacy Policy.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Already with us? <Link to="/login" className="font-medium text-navy hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
