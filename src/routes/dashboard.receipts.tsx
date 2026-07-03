import { createFileRoute } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Download, Share2, Receipt as ReceiptIcon } from "lucide-react";
import { receipts, formatNaira } from "@/lib/sample-data";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/receipts")({
  head: () => ({ meta: [{ title: "Receipts — Duesly" }] }),
  component: Page,
});

function Page() {
  return (
    <OrgShell title="Receipts" subtitle="Every receipt issued from your association."
      actions={<Button variant="hero" onClick={() => toast.success("Bulk receipt export queued")}><Download className="h-4 w-4" /> Export all</Button>}>
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
              {receipts.map((r) => (
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
                  <td className="px-5 py-3"><StatusBadge status={r.status === "Issued" ? "issued" : "partial"} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toast.success("Receipt downloaded")}><Download className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toast.success("Share link copied")}><Share2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </OrgShell>
  );
}
