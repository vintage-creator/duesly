import { createFileRoute } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getDashboardData, updateUserProfile, updateOrganization } from "@/lib/db-actions";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/dashboard/settings")({
  loader: async () => {
    return await getDashboardData();
  },
  head: () => ({ meta: [{ title: "Settings — Duesly" }] }),
  component: Page,
});

function Page() {
  const { orgName } = Route.useLoaderData();

  const [user, setUser] = useState<{ email: string; name: string; org_id?: string } | null>(null);
  const [profileName, setProfileName] = useState("");
  const [password, setPassword] = useState("");
  const [currentOrgName, setCurrentOrgName] = useState(orgName);
  const [currentOrgType, setCurrentOrgType] = useState(orgName.includes("Market") ? "Market" : orgName.includes("Estate") ? "Estate" : "Cooperative");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      setUser(parsed);
      setProfileName(parsed.name || "");
    }
  }, []);

  const handleOrgSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = user?.org_id || "ORG-001"; // fallback if missing
    setLoading(true);
    try {
      const res = await updateOrganization({
        data: {
          id: orgId,
          name: currentOrgName,
          type: currentOrgType
        }
      });
      if (res.success && res.org) {
        toast.success("Organization profile saved successfully!");
      } else {
        toast.error(res.error || "Failed to save organization");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving organization settings");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const res = await updateUserProfile({
        data: {
          email: user.email,
          name: profileName,
          password: password || "password" // default seed fallback
        }
      });
      if (res.success && res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        toast.success("Personal profile settings saved!");
        setPassword("");
      } else {
        toast.error(res.error || "Failed to save profile");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OrgShell title="Settings" subtitle="Organization profile, branding and notifications.">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side - Org profile and User Profile */}
        <div className="space-y-6 lg:col-span-2">
          {/* Org Profile */}
          <form className="rounded-2xl border bg-card p-5 shadow-soft" onSubmit={handleOrgSave}>
            <h3 className="font-display text-lg font-bold text-navy">Organization profile</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><Label>Organization name</Label><Input required value={currentOrgName} onChange={(e) => setCurrentOrgName(e.target.value)} /></div>
              <div><Label>Type</Label><Input required value={currentOrgType} onChange={(e) => setCurrentOrgType(e.target.value)} /></div>
              <div><Label>Contact email</Label><Input disabled value={`admin@${currentOrgName.toLowerCase().replace(/\s+/g, "")}.app`} className="bg-secondary" /></div>
              <div><Label>Phone</Label><Input disabled value="+234 803 412 9087" className="bg-secondary" /></div>
              <div className="sm:col-span-2"><Label>Address</Label><Input disabled value="Aba, Abia State" className="bg-secondary" /></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="hero" type="submit" disabled={loading}>
                {loading ? "Saving Organization..." : "Save Organization"}
              </Button>
            </div>
          </form>

          {/* User Profile */}
          {user && (
            <form className="rounded-2xl border bg-card p-5 shadow-soft" onSubmit={handleProfileSave}>
              <h3 className="font-display text-lg font-bold text-navy">User Credentials</h3>
              <p className="text-xs text-muted-foreground">Manage your credentials and passwords.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Your name</Label>
                  <Input required value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                </div>
                <div>
                  <Label>Email address (Username)</Label>
                  <Input disabled value={user.email} className="bg-secondary" />
                </div>
                <div className="sm:col-span-2">
                  <Label>New password (minimum 6 characters)</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Type new password to update" />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="hero" type="submit" disabled={loading}>
                  {loading ? "Saving Profile..." : "Update Profile & Password"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Right Side - Notifications & Settlements */}
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h3 className="font-display text-lg font-bold text-navy">Notifications</h3>
            <div className="mt-3 space-y-3 text-sm">
              {["Daily collection summary","SMS receipts to vendors","Weekly compliance report","Underpayment alerts"].map((l, i) => (
                <label key={l} className="flex items-center justify-between">
                  <span>{l}</span><Switch defaultChecked={i !== 2} />
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h3 className="font-display text-lg font-bold text-navy">Bank settlement</h3>
            <p className="mt-1 text-xs text-muted-foreground">Settlement Wallet · 0123456789 · {orgName}</p>
            <Button variant="soft" size="sm" className="mt-3" type="button" onClick={() => toast.success("Settlement bank modification form opened")}>Change account</Button>
            <div className="mt-4 border-t pt-3 flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-bold text-emerald flex items-center gap-0.5 min-w-[100px]">🛡️ Anti-Fraud Lock:</span>
              <span>Direct administrative withdrawals are restricted. Funds can only be routed to pre-authorized settlement bank accounts.</span>
            </div>
          </div>
        </div>
      </div>
    </OrgShell>
  );
}
