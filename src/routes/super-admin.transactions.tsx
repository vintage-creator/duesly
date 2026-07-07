import { createFileRoute } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { StatusBadge } from "@/components/duesly/status-badge";
import { formatNaira } from "@/lib/sample-data";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { getSuperAdminTransactions } from "@/lib/db-actions";

export const Route = createFileRoute("/super-admin/transactions")({
  loader: async () => {
    return await getSuperAdminTransactions();
  },
  head: () => ({ meta: [{ title: "Transactions — Duesly Admin" }] }),
  component: Page,
});

function Page() {
  const rows = Route.useLoaderData();

  const handleExport = () => {
    if (rows.length === 0) {
      toast.error("No transactions available to export.");
      return;
    }
    const headers = ["Reference ID", "Organization", "Vendor Name", "Virtual Account", "Amount (₦)", "Date", "Status"];
    const csvRows = [headers.join(",")];
    rows.forEach(p => {
      csvRows.push([
        p.id,
        `"${p.org}"`,
        `"${p.vendor}"`,
        p.account,
        p.amount,
        `"${p.date}"`,
        p.status
      ].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `duesly_platform_transactions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Platform transactions report downloaded!");
  };

  return (
    <SuperShell title="Transactions" subtitle="All inflows across every organization."
      actions={<Button variant="outline" onClick={handleExport} disabled={rows.length === 0}><Download className="h-4 w-4" /> Export</Button>}>
      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Ref</th>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Virtual a/c</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Fee (1.0%)</th>
                <th className="px-5 py-3 text-right">Net Settled</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const fee = p.amount * 0.01;
                const net = p.amount * 0.99;
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-5 py-3 font-mono text-xs">{p.id}</td>
                    <td className="px-5 py-3 font-medium">{p.org}</td>
                    <td className="px-5 py-3">{p.vendor}</td>
                    <td className="px-5 py-3 font-mono text-xs">{p.account}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatNaira(p.amount)}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground font-mono">{formatNaira(fee)}</td>
                    <td className="px-5 py-3 text-right text-emerald font-semibold font-mono">{formatNaira(net)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.date}</td>
                    <td className="px-5 py-3"><StatusBadge status={p.status.toLowerCase() === "matched" || p.status.toLowerCase() === "paid" ? "paid" : p.status.toLowerCase() === "overpaid" ? "overpaid" : "partial"} /></td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    No transactions recorded on the platform yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SuperShell>
  );
}
