import { createFileRoute, Link } from "@tanstack/react-router";
import { DueslyLogo } from "@/components/duesly/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Copy, MessageCircle, Download, LogOut, Receipt, Search, Bell, Lock } from "lucide-react";
import { formatNaira } from "@/lib/sample-data";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getVendorPortal, completeVendorOnboarding, getNotifications, markNotificationRead, clearAllNotifications } from "@/lib/db-actions";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/vendor-portal")({
  head: () => ({ meta: [{ title: "Vendor Portal — Duesly" }, { name: "description", content: "Track your dues, dedicated account, and receipts." }] }),
  component: Page,
});

type VendorInfo = {
  id: string;
  name: string;
  shop: string;
  phone: string;
  section: string;
  virtualAccount: string;
  due: number;
  paid: number;
  status: "paid" | "partial" | "unpaid" | "overpaid";
};

type PaymentInfo = {
  id: string;
  amount: number;
  category: string;
  date: string;
  status: string;
};

type ReceiptInfo = {
  id: string;
  category: string;
  amount: number;
  date: string;
  status: string;
};

function Page() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState<VendorInfo | null>(null);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [receipts, setReceipts] = useState<ReceiptInfo[]>([]);
  const [notiOpen, setNotiOpen] = useState(false);

  // Verification onboarding states
  const [isLookupOnly, setIsLookupOnly] = useState(true);
  const [onboardDialogOpen, setOnboardDialogOpen] = useState(false);
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardPassword, setOnboardPassword] = useState("");
  const [submittingOnboard, setSubmittingOnboard] = useState(false);
  const [showOnboardPass, setShowOnboardPass] = useState(false);
  const [activeNotis, setActiveNotis] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotis = () => {
    if (vendor) {
      getNotifications({
        data: {
          role: "vendor",
          orgId: vendor.orgId,
          vendorId: vendor.id
        }
      })
      .then((res) => {
        setActiveNotis(res || []);
        setUnreadCount((res || []).filter((n: any) => !n.read).length);
      })
      .catch(console.error);
    }
  };

  useEffect(() => {
    fetchNotis();
  }, [vendor, notiOpen]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead({ data: { id } });
      fetchNotis();
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleClearAll = async () => {
    if (vendor) {
      try {
        await clearAllNotifications({
          data: {
            role: "vendor",
            orgId: vendor.orgId,
            vendorId: vendor.id
          }
        });
        toast.success("All alerts cleared!");
        fetchNotis();
      } catch (err) {
        console.error("Failed to clear notifications:", err);
      }
    }
  };

  // Auto-login member session from unified login screen
  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed.role === "vendor") {
        setLoading(true);
        getVendorPortal({ data: { searchQuery: parsed.email || parsed.name } })
          .then((res) => {
            if (res.success && res.vendor) {
              setVendor(res.vendor as any);
              setPayments(res.payments || []);
              setReceipts(res.receipts || []);
              setIsLookupOnly(false);
            }
          })
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    }
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const res = await getVendorPortal({ data: { searchQuery } });
      if (res.success && res.vendor) {
        setVendor(res.vendor as any);
        setPayments(res.payments || []);
        setReceipts(res.receipts || []);
        setIsLookupOnly(true);
        toast.success(`Welcome, ${res.vendor.name}!`);
      } else {
        toast.error(res.error || "No matching record found.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during lookup.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    if (!onboardEmail.trim() || onboardPassword.length < 6) {
      toast.error("Please provide a valid email and a password of at least 6 characters");
      return;
    }
    setSubmittingOnboard(true);
    try {
      const res = await completeVendorOnboarding({
        data: {
          vendorId: vendor.id,
          email: onboardEmail,
          password: onboardPassword
        }
      });
      if (res.success && res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        setIsLookupOnly(false);
        setOnboardDialogOpen(false);
        toast.success("Portal access secured! Your email login is now active.");
      } else {
        toast.error(res.error || "Failed to complete onboarding");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error securing portal credentials");
    } finally {
      setSubmittingOnboard(false);
    }
  };

  const handleLogout = () => {
    setVendor(null);
    setPayments([]);
    setReceipts([]);
    setSearchQuery("");
    toast.success("Signed out of portal");
  };

  if (!vendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4">
        <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-elevated">
          <div className="flex justify-center mb-6">
            <DueslyLogo />
          </div>
          <div className="text-center mb-6">
            <h1 className="font-display text-xl font-bold text-navy">Access Vendor Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Check your dedicated account details, current due balances, and download receipts instantly.</p>
          </div>
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <Label htmlFor="search">Lookup details</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Phone number, shop, or account number"
                  className="pl-9"
                />
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? "Searching..." : "Access Portal"}
            </Button>
          </form>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-navy underline">Go back home</Link>
          </div>
        </div>
      </div>
    );
  }

  const initials = vendor.name.split(" ").map(p => p[0]).slice(0, 2).join("");
  const outstanding = Math.max(0, vendor.due - vendor.paid);

  const notificationsList = [
    ...(outstanding > 0 ? [{
      id: "alert-1",
      title: "Levy Overdue Notice",
      message: `Your outstanding dues of ${formatNaira(outstanding)} are overdue. Please transfer to your dedicated payment account number.`,
      date: "Today"
    }] : []),
    ...(receipts.length > 0 ? [{
      id: "alert-2",
      title: "Payment Reconciled",
      message: `Your payment of ${formatNaira(receipts[0].amount)} was matched and receipt ${receipts[0].id} was dispatched.`,
      date: receipts[0].date
    }] : []),
    {
      id: "alert-3",
      title: "Association Announcement",
      message: "Monthly dues coordination holds this Friday at the main secretariat by 4:00 PM.",
      date: "Yesterday"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <DueslyLogo />
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-navy">{vendor.name}</p>
              <p className="text-xs text-muted-foreground">Shop {vendor.shop} · {vendor.section}</p>
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative cursor-pointer" onClick={() => setNotiOpen(!notiOpen)}>
                <Bell className="h-4 w-4 text-navy" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
                )}
              </Button>
              {notiOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-card p-3 shadow-elevated z-50 text-left text-xs animate-fade-in-up">
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <p className="font-bold text-navy">Member Alerts ({unreadCount} new)</p>
                    {activeNotis.length > 0 && (
                      <button 
                        className="text-[10px] text-emerald hover:underline font-semibold cursor-pointer" 
                        onClick={handleClearAll}
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {activeNotis.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => handleMarkRead(n.id)}
                        className={cn(
                          "border-b border-border/60 pb-2 last:border-0 last:pb-0 cursor-pointer p-2 rounded-xl transition-colors hover:bg-secondary/40",
                          !n.read ? "bg-emerald/5 border-l-2 border-l-emerald pl-2.5" : ""
                        )}
                      >
                        <p className="font-semibold text-navy text-[11px] flex items-center justify-between">
                          {n.title}
                          {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-emerald" />}
                        </p>
                        <p className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[8px] text-muted-foreground/60 mt-1">
                          {new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    ))}
                    {activeNotis.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">No member alerts.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-emerald text-sm font-semibold text-white shadow-emerald">
              {initials}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {isLookupOnly && (
          <div className="mb-6 rounded-2xl border border-emerald/20 bg-emerald/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-fade-in-up">
            <div className="space-y-1">
              <h4 className="font-bold text-navy text-sm flex items-center gap-1.5">
                <Lock className="h-4 w-4" /> Lock your portal with a password
              </h4>
              <p className="text-xs text-muted-foreground font-sans">Set up your email and password to securely log in directly next time without entering search terms.</p>
            </div>
            <Dialog open={onboardDialogOpen} onOpenChange={setOnboardDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="hero" className="shrink-0 cursor-pointer" onClick={() => setOnboardDialogOpen(true)}>Complete Onboarding</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display font-bold text-navy text-lg">Set Portal Credentials</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCompleteOnboarding} className="space-y-4 py-2">
                  <div>
                    <Label htmlFor="onboard-email">Email Address</Label>
                    <Input id="onboard-email" type="email" required value={onboardEmail} onChange={(e) => setOnboardEmail(e.target.value)} placeholder="e.g. ngozi.obi@email.com" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="onboard-pass">Choose Password</Label>
                    <div className="relative mt-1">
                      <Input 
                        id="onboard-pass" 
                        type={showOnboardPass ? "text" : "password"} 
                        required 
                        value={onboardPassword} 
                        onChange={(e) => setOnboardPassword(e.target.value)} 
                        placeholder="At least 6 characters" 
                        className="pr-10" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowOnboardPass(!showOnboardPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy cursor-pointer flex items-center justify-center"
                      >
                        {showOnboardPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" onClick={() => setOnboardDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" variant="hero" disabled={submittingOnboard}>
                      {submittingOnboard ? "Completing..." : "Save & Secure Portal"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <div className="rounded-3xl bg-gradient-hero p-6 text-white shadow-elevated sm:p-8">
          <p className="text-sm text-white/70">Welcome back,</p>
          <h1 className="font-display text-3xl font-bold">{vendor.name}</h1>
          <p className="mt-1 text-sm text-white/70">Ariaria Market Association · Shop {vendor.shop} · {vendor.section}</p>

          <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-white/70">Your dedicated payment account · fund from any bank</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-display text-3xl font-bold tracking-wider">{vendor.virtualAccount}</p>
                <p className="mt-0.5 text-xs text-white/70">Nomba Account Number · {vendor.name}</p>
              </div>
              <Button variant="hero" onClick={() => { navigator.clipboard?.writeText(vendor.virtualAccount); toast.success("Account number copied to clipboard"); }}>
                <Copy className="h-4 w-4" /> Copy Account
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card label="Current dues" value={formatNaira(vendor.due)} sub="Total expected bill" />
          <Card label="Amount paid" value={formatNaira(vendor.paid)} sub="Total payments logged" accent="emerald" />
          <Card label="Outstanding" value={formatNaira(outstanding)} sub={<StatusBadge status={vendor.status} />} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-soft">
            <h3 className="font-display text-lg font-bold text-navy">Payment history & receipts</h3>
            <div className="mt-3 space-y-2">
              {receipts.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald/10 text-emerald"><Receipt className="h-4 w-4" /></div>
                    <div>
                      <p className="text-sm font-medium">{h.category}</p>
                      <p className="text-xs text-muted-foreground">{h.id} · {h.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatNaira(h.amount)}</span>
                    <Button size="icon" variant="ghost" onClick={() => toast.success(`Receipt ${h.id} downloaded successfully`)}><Download className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {receipts.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">No payment receipts issued yet.</p>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <h3 className="font-display text-lg font-bold text-navy">Need help?</h3>
              <p className="mt-1 text-sm text-muted-foreground">Reach your association admin directly.</p>
              <Button variant="hero" className="mt-4 w-full" onClick={() => toast.success("Support ticket opened. The association admin will message you soon.")}>
                <MessageCircle className="h-4 w-4" /> Contact admin
              </Button>
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <h3 className="font-display text-base font-bold text-navy">How to pay</h3>
              <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>1. Open your bank app or USSD portal.</li>
                <li>2. Transfer to <span className="font-mono text-navy font-semibold">{vendor.virtualAccount}</span> (Dedicated Account).</li>
                <li>3. Receive an instant SMS notification & receipt.</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub: React.ReactNode; accent?: "emerald" }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold ${accent === "emerald" ? "text-emerald" : "text-foreground"}`}>{value}</p>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
