import { createFileRoute } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { StatCard } from "@/components/duesly/stat-card";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Building2, Users, TrendingUp, Activity, Download, Wallet, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatNaira, formatNumber, monthlyTrend } from "@/lib/sample-data";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { getSuperAdminData, submitSuperAdminWithdrawal } from "@/lib/db-actions";
import { useState } from "react";

export const Route = createFileRoute("/super-admin/")({
  loader: async () => {
    return await getSuperAdminData();
  },
  head: () => ({ meta: [{ title: "Platform overview — Duesly" }] }),
  component: Page,
});

function Page() {
  const { stats, organizations, trend, wallet: initialWallet } = Route.useLoaderData();
  const [walletState, setWalletState] = useState(initialWallet || { balance: 0, savedBankName: "", savedAccountNumber: "", savedAccountName: "" });

  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBank, setWithdrawBank] = useState(initialWallet?.savedBankName || "Zenith Bank");
  const [withdrawAccount, setWithdrawAccount] = useState(initialWallet?.savedAccountNumber || "");
  const [withdrawAccountName, setWithdrawAccountName] = useState(initialWallet?.savedAccountName || "");
  const [saveDetails, setSaveDetails] = useState(true);
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid positive amount.");
      return;
    }
    if (amountNum > walletState.balance) {
      toast.error(`Insufficient balance. Maximum withdrawable: ₦${walletState.balance.toLocaleString()}`);
      return;
    }
    if (withdrawAccount.length !== 10) {
      toast.error("Please enter a valid 10-digit account number.");
      return;
    }
    if (!withdrawAccountName.trim()) {
      toast.error("Please enter the recipient account name.");
      return;
    }

    setSubmittingWithdrawal(true);
    const toastId = toast.loading("Processing platform profit withdrawal...");
    try {
      const localUser = localStorage.getItem("user");
      const parsed = localUser ? JSON.parse(localUser) : null;
      if (!parsed?.email) {
        toast.error("Super admin session expired. Please sign in again.", { id: toastId });
        return;
      }

      const res = await submitSuperAdminWithdrawal({
        data: {
          email: parsed.email,
          amount: amountNum,
          bankName: withdrawBank,
          accountNumber: withdrawAccount,
          accountName: withdrawAccountName,
          saveDetails: saveDetails
        }
      });

      if (res.success) {
        toast.success(`Platform profit withdrawal of ₦${amountNum.toLocaleString()} processed successfully!`, { id: toastId });
        setWithdrawAmount("");
        setWithdrawalOpen(false);
        setWalletState({
          balance: walletState.balance - amountNum,
          savedBankName: saveDetails ? withdrawBank : walletState.savedBankName,
          savedAccountNumber: saveDetails ? withdrawAccount : walletState.savedAccountNumber,
          savedAccountName: saveDetails ? withdrawAccountName : walletState.savedAccountName
        });
      } else {
        toast.error(res.error || "Failed to withdraw platform profits", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Connection error during withdrawal processing", { id: toastId });
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const isTrendEmpty = (trend || []).every(t => t.collected === 0);
  const activeRate = stats.totalOrgs > 0 ? Math.round((stats.activeOrgs / stats.totalOrgs) * 100) : 0;

  const [exporting, setExporting] = useState(false);

  const handleExportPDF = () => {
    if (organizations.length === 0) {
      toast.error("No organizations available to export.");
      return;
    }
    setExporting(true);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 100);
  };

  return (
    <SuperShell title="Platform Overview" subtitle="All organizations powered by Duesly"
      actions={<Button variant="outline" className="cursor-pointer" onClick={handleExportPDF} disabled={organizations.length === 0}><Download className="h-4 w-4" /> {exporting ? "Exporting..." : "Export"}</Button>}
    >
      {/* Super Admin Profit Wallet Banner */}
      <div className="mb-6 rounded-2xl border border-emerald/20 bg-gradient-to-r from-emerald/5 via-teal/5 to-navy/5 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-emerald text-white flex items-center justify-center shadow-emerald">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-display font-bold text-navy text-xs uppercase tracking-wider text-muted-foreground/60">Platform Profit Wallet</h4>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-display font-extrabold text-navy">{formatNaira(walletState.balance)}</span>
              <span className="text-[10px] bg-emerald/10 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">₦100 Flat Transaction Fee</span>
            </div>
          </div>
        </div>

        <Dialog open={withdrawalOpen} onOpenChange={setWithdrawalOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm" className="cursor-pointer gap-2" onClick={() => setWithdrawalOpen(true)}>
              <ArrowUpRight className="h-4 w-4" /> Withdraw Profits
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-6 bg-card border border-border shadow-elevated rounded-3xl animate-fade-in-up">
            <DialogHeader className="pb-3 border-b">
              <DialogTitle className="font-display font-bold text-navy text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald" /> Withdraw Platform Profits
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleWithdrawalSubmit} className="mt-4 space-y-4">
              <div className="bg-emerald/5 rounded-2xl p-4 border border-emerald/10 text-xs text-emerald-800 space-y-1">
                <p className="font-semibold">Profit Wallet Payout Transfer</p>
                <p>Transfer accumulated platform transaction fee profits directly to your personal bank account. This initiates a real-time transfer via Nomba MFB.</p>
              </div>

              <div>
                <Label htmlFor="super-withdraw-amount" className="text-xs font-semibold text-slate-600">Amount (₦)</Label>
                <Input 
                  id="super-withdraw-amount"
                  type="number"
                  required
                  min="1"
                  max={walletState.balance}
                  placeholder={`e.g. 5000 (Available: ₦${walletState.balance.toLocaleString()})`}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="super-withdraw-bank" className="text-xs font-semibold text-slate-600">Destination Bank Name</Label>
                <select 
                  id="super-withdraw-bank"
                  value={withdrawBank}
                  onChange={(e) => setWithdrawBank(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-navy outline-none focus:ring-2 focus:ring-emerald/20"
                >
                  <option value="Zenith Bank">Zenith Bank</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="Guaranty Trust Bank (GTB)">Guaranty Trust Bank (GTB)</option>
                  <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                  <option value="First Bank">First Bank</option>
                  <option value="OPay (Paycom)">OPay (Paycom)</option>
                  <option value="PalmPay">PalmPay</option>
                  <option value="Moniepoint MFB">Moniepoint MFB</option>
                  <option value="Kuda Microfinance Bank">Kuda Microfinance Bank</option>
                  <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                  <option value="Sterling Bank">Sterling Bank</option>
                  <option value="Union Bank">Union Bank</option>
                  <option value="Wema Bank">Wema Bank</option>
                  <option value="Fidelity Bank">Fidelity Bank</option>
                  <option value="Polaris Bank">Polaris Bank</option>
                  <option value="FCMB">FCMB</option>
                  <option value="Nombank MFB">Nombank MFB</option>
                </select>
              </div>

              <div>
                <Label htmlFor="super-withdraw-account" className="text-xs font-semibold text-slate-600">Destination Account Number</Label>
                <Input 
                  id="super-withdraw-account"
                  type="text"
                  required
                  maxLength={10}
                  placeholder="10-digit Nuban account number"
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value.replace(/\D/g, ""))}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="super-withdraw-name" className="text-xs font-semibold text-slate-600">Recipient Account Name</Label>
                <Input 
                  id="super-withdraw-name"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={withdrawAccountName}
                  onChange={(e) => setWithdrawAccountName(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  id="super-save-details" 
                  type="checkbox" 
                  checked={saveDetails} 
                  onChange={(e) => setSaveDetails(e.target.checked)}
                  className="rounded border-border text-emerald focus:ring-emerald cursor-pointer"
                />
                <Label htmlFor="super-save-details" className="text-xs text-muted-foreground cursor-pointer select-none">Save these bank details for future withdrawals</Label>
              </div>

              <DialogFooter className="mt-6 flex flex-row justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" className="cursor-pointer flex-1 sm:flex-none" onClick={() => setWithdrawalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="hero" className="cursor-pointer flex-1 sm:flex-none" disabled={submittingWithdrawal || walletState.balance <= 0}>
                  {submittingWithdrawal ? "Transferring..." : "Confirm Payout"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Organizations" value={formatNumber(stats.totalOrgs)} delta="+3 this quarter" trend="up" accent="navy" icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Vendors / Members" value={formatNumber(stats.totalMembers)} delta="Across all orgs" accent="info" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Total collected" value={formatNaira(stats.totalCollected)} delta="+18.6% YoY" trend="up" accent="emerald" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Active organizations" value={`${stats.activeOrgs}/${stats.totalOrgs}`} delta={`${activeRate}% active rate`} accent="gold" icon={<Activity className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Platform-wide collections</h3>
          <p className="text-sm text-muted-foreground">Across all Duesly-powered associations {stats.suffix ? `(₦${stats.suffix})` : "(₦)"}</p>
          <div className="mt-4 h-72">
            {stats.totalOrgs === 0 || trend.length === 0 || isTrendEmpty ? (
              <div className="h-full flex flex-col items-center justify-center border border-dashed rounded-2xl bg-secondary/5 text-center p-6">
                <TrendingUp className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-navy">No transaction data</p>
                <p className="text-xs text-muted-foreground max-w-[240px] mt-1 font-sans">Onboard your first client organization to start tracking collection trends.</p>
              </div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ left: -10, right: 10 }}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Area type="monotone" dataKey="collected" stroke="var(--emerald)" strokeWidth={2.5} fill="url(#sg)" name="Collected" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Recent organizations</h3>
          <ul className="mt-4 space-y-3">
            {organizations.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-emerald text-xs font-semibold text-white">{o.name.split(" ").map((w: string) => w[0]).slice(0,2).join("")}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.name}</p>
                  <p className="text-xs text-muted-foreground">{o.type} · {formatNumber(o.vendors)} vendors</p>
                </div>
                <StatusBadge status={o.status as any} />
              </li>
            ))}
            {organizations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No organizations created yet.</p>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-card shadow-soft">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-display text-lg font-bold text-navy">Organization status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Vendors</th>
                <th className="px-5 py-3 text-right">Collected (lifetime)</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-5 py-3 font-medium">{o.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{o.type}</td>
                  <td className="px-5 py-3 text-right">{formatNumber(o.vendors)}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNaira(o.collected)}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status as any} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Printable PDF Section */}
      <div id="printable-ledger" className="hidden">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-ledger, #printable-ledger * {
              visibility: visible;
            }
            #printable-ledger {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
              font-family: sans-serif;
              padding: 24px;
            }
          }
        `}</style>
        <div className="flex justify-between items-center border-b pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">duesly</span>
              <span className="text-[10px] border border-slate-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider">PLATFORM DIRECTORY</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mt-2">Duesly Admin Portal</h1>
            <p className="text-xs text-slate-500">Active Tenant Associations Registry</p>
          </div>
          <div className="text-right text-xs text-slate-500 leading-relaxed">
            <p><strong>Total Accounts:</strong> {organizations.length}</p>
            <p><strong>Generated Date:</strong> {new Date().toLocaleDateString("en-NG")}</p>
            <p><strong>System Status:</strong> Operational</p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-700 font-bold uppercase">
              <th className="py-2.5">Org ID</th>
              <th className="py-2.5">Association Name</th>
              <th className="py-2.5">Sector Type</th>
              <th className="py-2.5 text-right font-mono">Members Count</th>
              <th className="py-2.5 text-right font-mono">Lifetime Collections</th>
              <th className="py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((o) => (
              <tr key={o.id} className="border-b border-slate-200 text-slate-800">
                <td className="py-2.5 font-mono text-[10px]">{o.id}</td>
                <td className="py-2.5 font-semibold">{o.name}</td>
                <td className="py-2.5">{o.type}</td>
                <td className="py-2.5 text-right font-mono">{formatNumber(o.vendors)}</td>
                <td className="py-2.5 text-right font-mono font-semibold">{formatNaira(o.collected)}</td>
                <td className="py-2.5 font-bold uppercase text-[9px]">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 border-t pt-4 flex justify-between items-center text-[10px] text-slate-500">
          <p>Duesly Platforms Inc · Central Core System Diagnostics</p>
          <p>Page 1 of 1</p>
        </div>
      </div>
    </SuperShell>
  );
}
