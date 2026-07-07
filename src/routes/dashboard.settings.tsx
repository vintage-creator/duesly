import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getDashboardData, updateUserProfile, updateOrganization, submitSettlementChangeRequest } from "@/lib/db-actions";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/settings")({
  loader: async () => {
    return await getDashboardData();
  },
  head: () => ({ meta: [{ title: "Settings — Duesly" }] }),
  component: Page,
});

function Page() {
  const router = useRouter();
  const { orgName, orgPhone, orgAddress, walletAccount, dailySummaryActive, smsReceiptsActive, weeklyReportActive, underpaymentAlertsActive } = Route.useLoaderData();

  const [user, setUser] = useState<{ email: string; name: string; org_id?: string } | null>(null);
  const [profileName, setProfileName] = useState("");
  const [password, setPassword] = useState("");
  const [currentOrgName, setCurrentOrgName] = useState(orgName);
  const [currentOrgType, setCurrentOrgType] = useState(orgName.includes("Market") ? "Market" : orgName.includes("Estate") ? "Estate" : "Cooperative");
  const [currentOrgPhone, setCurrentOrgPhone] = useState(orgPhone || "");
  const [currentOrgAddress, setCurrentOrgAddress] = useState(orgAddress || "");
  const [currentWalletAccount, setCurrentWalletAccount] = useState(walletAccount || "");
  
  const [dailySummary, setDailySummary] = useState(dailySummaryActive ?? true);
  const [smsReceipts, setSmsReceipts] = useState(smsReceiptsActive ?? true);
  const [weeklyReport, setWeeklyReport] = useState(weeklyReportActive ?? false);
  const [underpaymentAlerts, setUnderpaymentAlerts] = useState(underpaymentAlertsActive ?? true);
  
  const [loading, setLoading] = useState(false);

  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [submittingChange, setSubmittingChange] = useState(false);

  const handleBankChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = user?.org_id || "ORG-001";
    setSubmittingChange(true);
    try {
      const res = await submitSettlementChangeRequest({
        data: {
          orgId,
          bankName,
          accountNumber,
          reason: changeReason
        }
      });
      if (res.success) {
        toast.success("Modification request submitted for Super-Admin review!");
        setBankDialogOpen(false);
        setBankName("");
        setAccountNumber("");
        setChangeReason("");
      } else {
        toast.error(res.error || "Failed to submit request");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting payout change request");
    } finally {
      setSubmittingChange(false);
    }
  };

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      setUser(parsed);
      setProfileName(parsed.name || "");
      
      const userOrgId = parsed.org_id;
      if (userOrgId) {
        getDashboardData({ data: { orgId: userOrgId } })
          .then((res: any) => {
            setCurrentOrgName(res.orgName);
            setCurrentOrgType(res.orgType);
            setCurrentOrgPhone(res.orgPhone || "");
            setCurrentOrgAddress(res.orgAddress || "");
            setCurrentWalletAccount(res.walletAccount || "");
            setDailySummary(res.dailySummaryActive ?? true);
            setSmsReceipts(res.smsReceiptsActive ?? true);
            setWeeklyReport(res.weeklyReportActive ?? false);
            setUnderpaymentAlerts(res.underpaymentAlertsActive ?? true);
          })
          .catch(console.error);
      }
    }
  }, [orgName]);

  const handleOrgSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = user?.org_id || "ORG-001"; // fallback if missing
    setLoading(true);
    try {
      const res = await updateOrganization({
        data: {
          id: orgId,
          name: currentOrgName,
          type: currentOrgType,
          phone: currentOrgPhone,
          address: currentOrgAddress
        }
      });
      if (res.success && res.org) {
        router.invalidate();
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

  const handleToggleSetting = async (key: string, val: boolean) => {
    const orgId = user?.org_id;
    if (!orgId) return;
    try {
      const res = await updateOrganization({
        data: {
          id: orgId,
          name: currentOrgName,
          type: currentOrgType,
          phone: currentOrgPhone,
          address: currentOrgAddress,
          [key]: val
        }
      });
      if (res.success) {
        toast.success("Setting updated successfully!");
        router.invalidate();
      } else {
        toast.error(res.error || "Failed to update setting");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating setting");
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
        window.dispatchEvent(new Event("user-updated"));
        router.invalidate();
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
              <div><Label>Contact email</Label><Input disabled value={user?.email || `admin@${currentOrgName.toLowerCase().replace(/\s+/g, "")}.app`} className="bg-secondary" /></div>
              <div><Label>Phone</Label><Input required value={currentOrgPhone} onChange={(e) => setCurrentOrgPhone(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Address</Label><Input required value={currentOrgAddress} onChange={(e) => setCurrentOrgAddress(e.target.value)} /></div>
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
            <p className="mt-1 text-xs text-muted-foreground">Toggle automated collection report dispatches.</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <label className="flex items-center justify-between">
                <span>Daily collection summary</span>
                <Switch 
                  checked={dailySummary} 
                  onCheckedChange={(v) => {
                    setDailySummary(v);
                    handleToggleSetting("dailySummaryActive", v);
                  }} 
                />
              </label>
              <label className="flex items-center justify-between">
                <span>SMS receipts to vendors</span>
                <Switch 
                  checked={smsReceipts} 
                  onCheckedChange={(v) => {
                    setSmsReceipts(v);
                    handleToggleSetting("smsReceiptsActive", v);
                  }} 
                />
              </label>
              <label className="flex items-center justify-between">
                <span>Weekly compliance report</span>
                <Switch 
                  checked={weeklyReport} 
                  onCheckedChange={(v) => {
                    setWeeklyReport(v);
                    handleToggleSetting("weeklyReportActive", v);
                  }} 
                />
              </label>
              <label className="flex items-center justify-between">
                <span>Underpayment alerts</span>
                <Switch 
                  checked={underpaymentAlerts} 
                  onCheckedChange={(v) => {
                    setUnderpaymentAlerts(v);
                    handleToggleSetting("underpaymentAlertsActive", v);
                  }} 
                />
              </label>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h3 className="font-display text-lg font-bold text-navy">Bank settlement</h3>
            <p className="mt-1 text-xs text-muted-foreground">Settlement Wallet · {currentWalletAccount} · {currentOrgName}</p>
            <Button variant="soft" size="sm" className="mt-3 cursor-pointer" type="button" onClick={() => setBankDialogOpen(true)}>Change account</Button>
            <div className="mt-4 border-t pt-3 flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-bold text-emerald flex items-center gap-0.5 min-w-[100px]">🛡️ Anti-Fraud Lock:</span>
              <span>Direct administrative withdrawals are restricted. Funds can only be routed to pre-authorized settlement bank accounts.</span>
            </div>

            <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display font-bold text-navy text-lg">Request Payout Account Change</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBankChangeSubmit} className="space-y-4 py-2">
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
                    <span className="font-bold">Security Lock:</span>
                    <span>For security and anti-fraud purposes, all settlement account modifications require review and validation by Duesly operations trustees.</span>
                  </div>
                  <div>
                    <Label htmlFor="bank-name">New Bank Name</Label>
                    <Input id="bank-name" required value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Wema Bank, Zenith Bank" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="account-num">New Account Number</Label>
                    <Input id="account-num" required maxLength={10} minLength={10} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))} placeholder="10-digit NUBAN" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="change-reason">Reason for Change</Label>
                    <textarea 
                      id="change-reason" 
                      required 
                      minLength={10}
                      rows={3}
                      value={changeReason} 
                      onChange={(e) => setChangeReason(e.target.value)} 
                      placeholder="Please explain the reason for updating the authorized payout account..." 
                      className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" onClick={() => setBankDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" variant="hero" disabled={submittingChange}>
                      {submittingChange ? "Submitting Request..." : "Submit for Verification"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </OrgShell>
  );
}
