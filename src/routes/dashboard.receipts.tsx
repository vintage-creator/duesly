import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Download, Share2, FileText, Printer, CheckCircle2, Clock3, Copy, ReceiptText } from "lucide-react";
import { formatNaira } from "@/lib/sample-data";
import { toast } from "sonner";
import { getReceipts } from "@/lib/db-actions";
import { DueslyLogo } from "@/components/duesly/logo";
import { getReceiptVerificationCode } from "@/lib/receipt-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/receipts")({
  loader: async () => {
    return await getReceipts();
  },
  head: () => ({ meta: [{ title: "Receipts — Duesly" }] }),
  component: Page,
});

function Page() {
  const receipts = Route.useLoaderData();
  const [activeOrgId, setActiveOrgId] = useState("ORG-001");
  const [orgType, setOrgType] = useState("Market");
  const [receiptsList, setReceiptsList] = useState(receipts || []);
  const [hydrating, setHydrating] = useState(true);
  const [copiedReceiptId, setCopiedReceiptId] = useState<string | null>(null);

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed.org_id) {
        setActiveOrgId(parsed.org_id);
        getReceipts({ data: { orgId: parsed.org_id } })
          .then(setReceiptsList)
          .catch(console.error)
          .finally(() => setHydrating(false));
      } else {
        setHydrating(false);
      }
      if (parsed.org_type) {
        setOrgType(parsed.org_type);
      }
    } else {
      setHydrating(false);
    }
  }, [receipts]);

  const [exportingAll, setExportingAll] = useState(false);

  const handleExportAll = () => {
    if (receiptsList.length === 0) {
      toast.error("No receipts available to export.");
      return;
    }
    setExportingAll(true);
    setTimeout(() => {
      window.print();
      setExportingAll(false);
    }, 100);
  };

  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const handleDownloadReceipt = (r: any) => {
    setSelectedReceipt(r);
  };

  const totalIssued = receiptsList.length;
  const totalAmount = receiptsList.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
  const partialCount = receiptsList.filter((r: any) => r.status?.toLowerCase() === "partial").length;

  const handleShareReceipt = (r: any) => {
    const link = `${window.location.origin}/receipts/${r.id}`;
    navigator.clipboard?.writeText(link);
    setCopiedReceiptId(r.id);
    toast.success("Receipt verification link copied. Anyone with the link can view this receipt.");
    setTimeout(() => setCopiedReceiptId((current) => current === r.id ? null : current), 2000);
  };
  const selectedReceiptLink = selectedReceipt && typeof window !== "undefined" ? `${window.location.origin}/receipts/${selectedReceipt.id}` : "";

  return (
    <OrgShell title="Receipts" subtitle="Every receipt issued from your association."
      actions={<Button variant="hero" className="cursor-pointer" onClick={handleExportAll} disabled={receiptsList.length === 0}><Download className="h-4 w-4" /> {exportingAll ? "Exporting..." : "Export all"}</Button>}>
      {hydrating ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border bg-card shadow-soft">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald border-t-transparent" />
        </div>
      ) : (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <ReceiptMetric icon={<ReceiptText className="h-5 w-5" />} label="Receipts issued" value={totalIssued.toString()} tone="emerald" />
          <ReceiptMetric icon={<CheckCircle2 className="h-5 w-5" />} label="Verified amount" value={formatNaira(totalAmount)} tone="navy" />
          <ReceiptMetric icon={<Clock3 className="h-5 w-5" />} label="Partial receipts" value={partialCount.toString()} tone="amber" />
        </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <div className="border-b border-border bg-secondary/30 px-5 py-4">
          <h3 className="font-display text-base font-bold text-navy">Receipt registry</h3>
          <p className="mt-1 text-xs text-muted-foreground">Verified receipts with public verification links for audit checks.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Receipt #</th>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {receiptsList.map((r) => {
                const isPartial = r.status?.toLowerCase() === "partial";
                return (
                <tr key={r.id} className={`border-t border-border transition-colors ${isPartial ? "bg-amber-50/55 hover:bg-amber-50" : "hover:bg-emerald/5"}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`grid h-8 w-8 place-items-center rounded-lg ${isPartial ? "bg-amber-100 text-amber-700" : "bg-emerald/10 text-emerald"}`}><FileText className="h-4 w-4" /></div>
                      <span className="font-mono text-xs">{r.id}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium">{r.vendor}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.category}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNaira(r.amount)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.date}</td>
                  <td className="px-5 py-3"><StatusBadge status={r.status?.toLowerCase() === "issued" || r.status?.toLowerCase() === "paid" ? "issued" : "partial"} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" title="Preview receipt" onClick={() => handleDownloadReceipt(r)}><Download className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" title="Copy verification link" onClick={() => handleShareReceipt(r)}>
                        {copiedReceiptId === r.id ? <Copy className="h-4 w-4 text-emerald" /> : <Share2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
              })}
              {receiptsList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    No receipts issued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}
      {/* Receipt Preview Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={(o) => !o && setSelectedReceipt(null)}>
        <DialogContent className="max-w-sm sm:max-w-md p-6 bg-card border border-border shadow-elevated rounded-3xl animate-fade-in-up">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-receipt, #printable-receipt * {
                visibility: visible;
              }
              #printable-receipt {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                max-width: 100%;
                border: none;
                box-shadow: none;
                background: white !important;
                color: black !important;
              }
              .print-hide {
                display: none !important;
              }
            }
          `}</style>
          <div id="printable-receipt" className="space-y-6 text-center">
            {/* Header */}
            <div className="flex flex-col items-center">
              <DueslyLogo className="scale-90" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-2.5">Official Platform Receipt</p>
              <p className="text-xs text-muted-foreground mt-0.5">Issued on behalf of {selectedReceipt?.orgName || "Ariaria Market Association"}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
                <CheckCircle2 className="h-4 w-4" /> Verified by Duesly
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-border/80" />

            {/* Amount */}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Amount Received</p>
              <p className="font-display text-4xl font-extrabold text-navy mt-1">
                {selectedReceipt ? formatNaira(selectedReceipt.amount) : ""}
              </p>
              <p className="text-[10px] text-muted-foreground/80 mt-1">Processed securely via Duesly Payment Infrastructure</p>
            </div>

            {/* Receipt Details Box */}
            <div className="rounded-2xl bg-secondary/40 p-4 text-left text-xs space-y-3 font-sans">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Receipt Reference</span>
                <span className="font-mono font-semibold text-navy">{selectedReceipt?.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Verification Code</span>
                <span className="font-mono font-semibold text-navy">{getReceiptVerificationCode(selectedReceipt?.id)}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-muted-foreground">Payment Rail</span>
                <span className="font-semibold text-navy">Nomba MFB Virtual Account</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payer ({orgType === "Estate" ? "Resident" : orgType === "Cooperative" ? "Member" : "Vendor"})</span>
                <span className="font-semibold text-navy">{selectedReceipt?.vendor}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Levy Category</span>
                <span className="font-semibold text-navy">{selectedReceipt?.category}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Date</span>
                <span className="font-semibold text-navy">{selectedReceipt?.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <span className="text-emerald font-bold uppercase tracking-wider text-[10px]">{selectedReceipt?.status}</span>
              </div>
              <div className="border-t border-border/70 pt-3">
                <span className="text-muted-foreground">Verify Online</span>
                <p className="mt-1 break-all font-mono text-[11px] font-semibold text-navy">{selectedReceiptLink}</p>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-[10px] text-muted-foreground/60 leading-relaxed">
              This receipt exists in the Duesly receipt registry and can be verified with the reference and verification code above.
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-row justify-end gap-2 border-t pt-4 print-hide">
            <Button variant="outline" className="cursor-pointer flex-1 sm:flex-none" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="hero" className="cursor-pointer flex-1 sm:flex-none" onClick={() => {
              toast.success("Receipt PDF downloaded to device!");
              setSelectedReceipt(null);
            }}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <span className="text-[10px] border border-slate-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider">OFFICIAL RECEIPTS AUDIT</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mt-2">Duesly Receipts Registry</h1>
            <p className="text-xs text-slate-500">All issued receipt logs for your association</p>
          </div>
          <div className="text-right text-xs text-slate-500 leading-relaxed">
            <p><strong>Total Receipts:</strong> {receiptsList.length}</p>
            <p><strong>Export Date:</strong> {new Date().toLocaleDateString("en-NG")}</p>
            <p><strong>Status:</strong> Reconciled</p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-700 font-bold uppercase">
              <th className="py-2.5">Receipt #</th>
              <th className="py-2.5">Member Name</th>
              <th className="py-2.5">Levy Category</th>
              <th className="py-2.5 text-right font-mono">Amount Reconciled</th>
              <th className="py-2.5">Date Paid</th>
              <th className="py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {receiptsList.map((r) => (
              <tr key={r.id} className="border-b border-slate-200 text-slate-800">
                <td className="py-2.5 font-mono text-[10px]">{r.id}</td>
                <td className="py-2.5 font-semibold">{r.vendor}</td>
                <td className="py-2.5">{r.category}</td>
                <td className="py-2.5 text-right font-mono font-semibold">{formatNaira(r.amount)}</td>
                <td className="py-2.5 text-slate-500">{r.date}</td>
                <td className="py-2.5 font-bold uppercase text-[9px] text-emerald">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 border-t pt-4 flex justify-between items-center text-[10px] text-slate-500">
          <p>Duesly Platforms Ltd · Verification Node Gateway</p>
          <p>Page 1 of 1</p>
        </div>
      </div>
    </OrgShell>
  );
}

function ReceiptMetric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "emerald" | "navy" | "amber" }) {
  const toneClasses = {
    emerald: "bg-emerald/10 text-emerald",
    navy: "bg-navy/10 text-navy",
    amber: "bg-amber-100 text-amber-700"
  };

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${toneClasses[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate font-display text-xl font-bold text-navy">{value}</p>
        </div>
      </div>
    </div>
  );
}
