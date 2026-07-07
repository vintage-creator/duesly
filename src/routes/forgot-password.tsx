import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { forgotPassword } from "@/lib/db-actions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Duesly" }] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await forgotPassword({ data: { email } });
      if (res.success) {
        setSent(true);
        toast.success(res.message);
      } else {
        toast.error("Failed to send reset link");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error sending reset request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a secure link to choose a new password.">
      {sent ? (
        <div className="rounded-2xl border border-emerald/30 bg-emerald/5 p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald/15 text-emerald">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="mt-4 font-display text-lg font-bold text-navy">Check your email</p>
          <p className="mt-1 text-sm text-muted-foreground">If an account exists for {email}, we have sent a password reset link.</p>
          <Button asChild variant="navy" className="mt-6 w-full"><Link to="/login">Back to sign in</Link></Button>
        </div>
      ) : (
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
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Sending link..." : "Send reset link"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Remembered it? <Link to="/login" className="font-medium text-navy hover:underline">Sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
