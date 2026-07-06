import { createFileRoute, useRouter } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { updateUserProfile, getSystemSettings, updateSystemSetting } from "@/lib/db-actions";

export const Route = createFileRoute("/super-admin/settings")({
  head: () => ({ meta: [{ title: "Platform settings — Duesly Admin" }] }),
  component: Page,
});

function Page() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [profileName, setProfileName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [autoApprove, setAutoApprove] = useState(true);
  const [sendSms, setSendSms] = useState(true);
  const [enableUssd, setEnableUssd] = useState(false);
  const [whatsappBot, setWhatsappBot] = useState(false);

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      setUser(parsed);
      setProfileName(parsed.name || "");
    }

    // Load global settings
    getSystemSettings()
      .then((res: any) => {
        setAutoApprove(res.autoApprove);
        setSendSms(res.sendSms);
        setEnableUssd(res.enableUssd);
        setWhatsappBot(res.whatsappBot);
      })
      .catch(console.error);
  }, []);

  const handleToggleSetting = async (key: string, val: boolean) => {
    try {
      const res = await updateSystemSetting({
        data: {
          key,
          value: val
        }
      });
      if (res.success) {
        toast.success("Platform configuration updated!");
        router.invalidate();
      } else {
        toast.error("Failed to update configuration");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving configuration");
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
          password: password || "Duesly7817##**"
        }
      });
      if (res.success && res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        window.dispatchEvent(new Event("user-updated"));
        router.invalidate();
        toast.success("Super Admin credentials updated successfully!");
        setPassword("");
      } else {
        toast.error(res.error || "Failed to save profile");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SuperShell title="Platform Settings" subtitle="Manage the Duesly platform configuration.">
      <div className="grid gap-6 lg:grid-cols-2">
        <form className="rounded-2xl border bg-card p-5 shadow-soft space-y-4" onSubmit={(e) => e.preventDefault()}>
          <h3 className="font-display text-lg font-bold text-navy">Platform Settings</h3>
          <div><Label>Platform name</Label><Input disabled value="Duesly" className="bg-secondary" /></div>
          <div><Label>Support email</Label><Input disabled value="support@duesly.app" className="bg-secondary" /></div>
          <div><Label>Platform fee (%)</Label><Input disabled value="1.0%" className="bg-secondary" /></div>
          <p className="text-[10px] text-muted-foreground mt-2">🔒 Note: Global system configuration parameters are locked. Contact primary operators to change transaction routing or platform fee splits.</p>
          <div className="flex justify-end pt-2">
            <Button disabled variant="outline">Config Locked</Button>
          </div>
        </form>

        <form className="rounded-2xl border bg-card p-5 shadow-soft space-y-4" onSubmit={handleProfileSave}>
          <h3 className="font-display text-lg font-bold text-navy">Your Super Admin Profile</h3>
          {user && (
            <>
              <div>
                <Label>Super Admin Name</Label>
                <Input required value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              </div>
              <div>
                <Label>Login Email</Label>
                <Input disabled value={user.email} className="bg-secondary" />
              </div>
              <div>
                <Label>Update Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Type new password to update" />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" variant="hero" disabled={loading}>
                  {loading ? "Saving Credentials..." : "Update Credentials"}
                </Button>
              </div>
            </>
          )}
        </form>

        <div className="rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
          <h3 className="font-display text-lg font-bold text-navy">Feature Toggles</h3>
          <div className="mt-3 text-sm grid sm:grid-cols-2 gap-4">
            <label className="flex items-center justify-between border-b pb-2">
              <span>Auto-approve new organizations</span>
              <Switch 
                checked={autoApprove} 
                onCheckedChange={(v) => {
                  setAutoApprove(v);
                  handleToggleSetting("auto_approve", v);
                }} 
              />
            </label>
            <label className="flex items-center justify-between border-b pb-2">
              <span>Send SMS receipts</span>
              <Switch 
                checked={sendSms} 
                onCheckedChange={(v) => {
                  setSendSms(v);
                  handleToggleSetting("send_sms", v);
                }} 
              />
            </label>
            <label className="flex items-center justify-between border-b pb-2">
              <span>Enable USSD payments</span>
              <Switch 
                checked={enableUssd} 
                onCheckedChange={(v) => {
                  setEnableUssd(v);
                  handleToggleSetting("enable_ussd", v);
                }} 
              />
            </label>
            <label className="flex items-center justify-between border-b pb-2">
              <span>Beta: WhatsApp bot</span>
              <Switch 
                checked={whatsappBot} 
                onCheckedChange={(v) => {
                  setWhatsappBot(v);
                  handleToggleSetting("whatsapp_bot", v);
                }} 
              />
            </label>
          </div>
        </div>
      </div>
    </SuperShell>
  );
}
