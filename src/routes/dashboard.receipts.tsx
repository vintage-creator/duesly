import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Download, Share2, Receipt as ReceiptIcon } from "lucide-react";
import { formatNaira } from "@/lib/sample-data";
import { toast } from "sonner";
import { getReceipts } from "@/lib/db-actions";

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

  const handleDownloadReceipt = (r: any) => {
    const docket = `
========================================
             DUESLY RECEIPT             
========================================
Receipt ID: ${r.id}
Vendor: ${r.vendor}
Category: ${r.category}
Amount Paid: ₦${Number(r.amount).toLocaleString("en-NG")}
Date: ${r.date}
Status: ${r.status}
----------------------------------------
   Powered by Nomba Webhook Settler     
========================================
    `;
    const blob = new Blob([docket], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `receipt_${r.id}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Receipt ${r.id} downloaded successfully!`);
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
    </OrgShell>
  );
}
