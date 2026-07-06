import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/duesly/status-badge";
import { formatNaira } from "@/lib/sample-data";
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getReconciliations, resolveReconciliation, sendReconciliationReminder, resendReconciliationReceipt, getVendors } from "@/lib/db-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/payments")({
  loader: async () => {
    return await getReconciliations();
  },
  head: () => ({ meta: [{ title: "Payments & Reconciliation — Duesly" }] }),
  component: Page,
});

function Page() {
  const reconciliation = Route.useLoaderData();
  const router = useRouter();

  const [activeOrgId, setActiveOrgId] = useState("ORG-001");
  const [reconciliationList, setReconciliationList] = useState(reconciliation);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed.org_id) {
        setActiveOrgId(parsed.org_id);
        getReconciliations({ data: { orgId: parsed.org_id } })
          .then(setReconciliationList)
          .catch(console.error)
          .finally(() => setHydrating(false));
      } else {
        setHydrating(false);
      }
    } else {
      setHydrating(false);
    }
  }, [reconciliation]);

  const matched = reconciliationList.filter((r) => r.status === "matched").length;
  const over = reconciliationList.filter((r) => r.status === "overpaid").length;
  const under = reconciliationList.filter((r) => r.status === "underpaid").length;
  const review = reconciliationList.filter((r) => r.status === "review").length;

  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [matchingItem, setMatchingItem] = useState<any | null>(null);
  const [matchVendorId, setMatchVendorId] = useState("");
  const [submittingMatch, setSubmittingMatch] = useState(false);

  useEffect(() => {
    getVendors({ data: { orgId: activeOrgId } })
      .then(setVendorsList)
      .catch(console.error);
  }, [activeOrgId]);

  const handleManualMatch = (item: any) => {
    setMatchingItem(item);
  };

  const handleManualMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchingItem || !matchVendorId) return;

    const selectedVendor = vendorsList.find(v => v.id === matchVendorId);
    if (!selectedVendor) return;

    setSubmittingMatch(true);
    try {
      const res = await resolveReconciliation({
        data: {
          id: matchingItem.id,
          action: "matched",
          vendorName: selectedVendor.name,
          orgId: activeOrgId
        }
      });
      if (res.success) {
        toast.success(`Payment matched successfully to ${selectedVendor.name}!`);
        setMatchingItem(null);
        setMatchVendorId("");
        getReconciliations({ data: { orgId: activeOrgId } }).then(setReconciliationList).catch(console.error);
        router.invalidate();
      } else {
        toast.error("Failed to match payment.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error matching payment.");
    } finally {
      setSubmittingMatch(false);
    }
  };

  const handleApplyCredit = async (id: string) => {
    try {
      const res = await resolveReconciliation({ data: { id, action: "matched", orgId: activeOrgId } });
      if (res.success) {
        toast.success("Overpayment credit applied to vendor's next cycle balance!");
        getReconciliations({ data: { orgId: activeOrgId } }).then(setReconciliationList).catch(console.error);
        router.invalidate();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error applying credit.");
    }
  };

  const [loadingReminder, setLoadingReminder] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);

  const handleSendReminder = async (id: string) => {
    setLoadingReminder(id);
    try {
      const res = await sendReconciliationReminder({ data: { reconciliationId: id, orgId: activeOrgId } });
      if (res.success) {
        toast.success("Payment reminder sent successfully!");
        router.invalidate();
      } else {
        toast.error(res.error || "Failed to send reminder");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error sending payment reminder.");
    } finally {
      setLoadingReminder(null);
    }
  };

  const handleResendReceipt = async (id: string) => {
    setLoadingReceipt(id);
    try {
      const res = await resendReconciliationReceipt({ data: { reconciliationId: id, orgId: activeOrgId } });
      if (res.success) {
        toast.success("Receipt successfully re-dispatched to vendor!");
        router.invalidate();
      } else {
        toast.error(res.error || "Failed to resend receipt");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error resending receipt.");
    } finally {
      setLoadingReceipt(null);
    }
  };

  return (
    <OrgShell title="Payments & Reconciliation" subtitle="Every inflow, matched to the right vendor and category."
      actions={<Button variant="outline" onClick={() => { router.invalidate(); toast.success("Manual reconciliation refreshed"); }}><RefreshCw className="mr-2 h-4 w-4" /> Refresh feed</Button>}
    >
      {hydrating ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border bg-card shadow-soft">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald border-t-transparent" />
        </div>
      ) : (
      <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={<Check className="h-5 w-5" />} label="Matched" value={matched} accent="emerald" />
        <Tile icon={<ArrowUpRight className="h-5 w-5" />} label="Overpayments" value={over} accent="info" />
        <Tile icon={<ArrowDownLeft className="h-5 w-5" />} label="Underpayments" value={under} accent="gold" />
        <Tile icon={<AlertTriangle className="h-5 w-5" />} label="Review queue" value={review} accent="destructive" />
      </div>

      <div className="mt-6 rounded-2xl border bg-card shadow-soft">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-display text-lg font-bold text-navy">Incoming payments</h3>
          <p className="text-sm text-muted-foreground">Live feed from connected virtual accounts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Ref</th>
                <th className="px-5 py-3">Source a/c</th>
                <th className="px-5 py-3">Matched vendor</th>
                <th className="px-5 py-3 text-right">Expected</th>
                <th className="px-5 py-3 text-right">Paid</th>
                <th className="px-5 py-3 text-right">Difference</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reconciliationList.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-5 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-5 py-3 font-mono text-xs">{r.source}</td>
                  <td className="px-5 py-3 font-medium">{r.vendor}</td>
                  <td className="px-5 py-3 text-right">{r.expected ? formatNaira(r.expected) : "—"}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNaira(r.paid)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${r.diff > 0 ? "text-info" : r.diff < 0 ? "text-destructive" : "text-emerald"}`}>
                    {r.diff === 0 ? "—" : `${r.diff > 0 ? "+" : ""}${formatNaira(r.diff)}`}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3 text-right">
                    {r.status === "review" ? (
                      <Button size="sm" variant="navy" className="cursor-pointer" onClick={() => handleManualMatch(r)}>Match</Button>
                    ) : r.status === "overpaid" ? (
                      <Button size="sm" variant="outline" onClick={() => handleApplyCredit(r.id)}>Apply credit</Button>
                    ) : r.status === "underpaid" ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleSendReminder(r.id)}
                        disabled={loadingReminder === r.id}
                        className="cursor-pointer"
                      >
                        {loadingReminder === r.id ? "Sending..." : "Remind"}
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleResendReceipt(r.id)}
                        disabled={loadingReceipt === r.id}
                        className="cursor-pointer"
                      >
                        {loadingReceipt === r.id ? "Sending..." : "Receipt"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {reconciliationList.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    No transactions found in feed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Manual Match Dialog */}
      <Dialog open={!!matchingItem} onOpenChange={(o) => !o && setMatchingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-navy text-lg">Manual Payment Matching</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManualMatchSubmit} className="space-y-4 py-2">
            <div className="rounded-xl border border-info/20 bg-info/5 p-3 text-xs text-[color:var(--info-foreground)] space-y-1">
              <p><strong>Unreconciled Inflow Details:</strong></p>
              <p>· Reference: <span className="font-mono">{matchingItem?.id}</span></p>
              <p>· Source Bank Account: <span className="font-mono">{matchingItem?.source}</span></p>
              <p>· Amount Deposited: <span className="font-bold text-emerald">{matchingItem ? formatNaira(matchingItem.paid) : "—"}</span></p>
            </div>
            <div>
              <Label htmlFor="match-vendor">Select Member to Associate Payment</Label>
              <div className="mt-1">
                <Select value={matchVendorId} onValueChange={setMatchVendorId}>
                  <SelectTrigger id="match-vendor" className="w-full bg-transparent border-border focus:ring-emerald cursor-pointer">
                    <SelectValue placeholder="Select vendor name..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56 overflow-y-auto">
                    {vendorsList.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="cursor-pointer">
                        {v.name} (Shop {v.shop} · {v.section})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setMatchingItem(null)}>Cancel</Button>
              <Button type="submit" variant="hero" disabled={submittingMatch || !matchVendorId} className="cursor-pointer">
                {submittingMatch ? "Matching..." : "Confirm Match"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </OrgShell>
  );
}

function Tile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: "emerald"|"info"|"gold"|"destructive" }) {
  const map = {
    emerald: "bg-emerald/10 text-emerald",
    info: "bg-info/10 text-info",
    gold: "bg-gold/15 text-[color:var(--gold-foreground)]",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className={`inline-grid h-10 w-10 place-items-center rounded-xl ${map[accent]}`}>{icon}</div>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
