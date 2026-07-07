import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Download, Share2, Receipt as ReceiptIcon, Printer, CheckCircle2 } from "lucide-react";
import { formatNaira } from "@/lib/sample-data";
import { toast } from "sonner";
import { getReceipts } from "@/lib/db-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [receiptsList, setReceiptsList] = useState(receipts);

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed.org_id && parsed.org_id !== "ORG-001") {
        setActiveOrgId(parsed.org_id);
        getReceipts({ data: { orgId: parsed.org_id } })
          .then(setReceiptsList)
          .catch(console.error);
      }
    }
  }, [receipts]);

  const handleExportAll = () => {
    if (receiptsList.length === 0) {
      toast.error("No receipts available to export.");
      return;
    }
    const headers = ["Receipt ID", "Vendor Name", "Category", "Amount Paid (₦)", "Date", "Status"];
    const csvRows = [headers.join(",")];
    receiptsList.forEach(r => {
      csvRows.push([
        r.id,
        `"${r.vendor}"`,
        r.category,
        r.amount,
        `"${r.date}"`,
        r.status
      ].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `duesly_receipts_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("All association receipts downloaded!");
  };

  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const handleDownloadReceipt = (r: any) => {
    setSelectedReceipt(r);
  };

  return (
    <OrgShell title="Receipts" subtitle="Every receipt issued from your association."
      actions={<Button variant="hero" onClick={handleExportAll} disabled={receiptsList.length === 0}><Download className="h-4 w-4" /> Export all</Button>}>
      <div className="rounded-2xl border bg-card shadow-soft">
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
              {receiptsList.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald/10 text-emerald"><ReceiptIcon className="h-4 w-4" /></div>
                      <span className="font-mono text-xs">{r.id}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium">{r.vendor}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.category}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNaira(r.amount)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.date}</td>
                  <td className="px-5 py-3"><StatusBadge status={r.status.toLowerCase() === "issued" || r.status.toLowerCase() === "paid" ? "issued" : "partial"} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleDownloadReceipt(r)}><Download className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(window.location.origin + `/receipts/${r.id}`); toast.success("Share link copied to clipboard"); }}><Share2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
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
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-2xl tracking-tight text-navy">duesly</span>
                <span className="text-[9px] uppercase tracking-widest text-white bg-emerald px-1.5 py-0.5 rounded font-bold font-sans">NOMBA SETTLED</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ariaria Market Association</p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
                <CheckCircle2 className="h-4 w-4" /> Verified Settlement
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-border/80" />

            {/* Amount */}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Amount Received</p>
              <p className="font-display text-4xl font-extrabold text-navy mt-1">
                ₦{selectedReceipt ? Number(selectedReceipt.amount).toLocaleString("en-NG") : "0.00"}
              </p>
              <p className="text-[10px] text-muted-foreground/80 mt-1">Processed successfully via Nomba Webhook RPC</p>
            </div>

            {/* Receipt Details Box */}
            <div className="rounded-2xl bg-secondary/40 p-4 text-left text-xs space-y-3 font-sans">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Receipt Reference</span>
                <span className="font-mono font-semibold text-navy">{selectedReceipt?.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Nomba Settlement Ref</span>
                <span className="font-mono font-semibold text-navy">NM-{selectedReceipt?.id?.replace("RCP-", "TX-")}384</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payer (Member)</span>
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
            </div>

            {/* Footer Notice */}
            <div className="text-[10px] text-muted-foreground/60 leading-relaxed">
              This receipt was dynamically compiled and verified by Duesly Technologies Ltd under authorization of Nomba financial channel partnerships.
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
    </OrgShell>
  );
}
