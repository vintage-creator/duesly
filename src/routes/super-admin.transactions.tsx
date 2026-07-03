import { createFileRoute } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { StatusBadge } from "@/components/duesly/status-badge";
import { recentPayments, organizations, formatNaira } from "@/lib/sample-data";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Duesly Admin" }] }),
  component: Page,
});

function Page() {
  const rows = recentPayments.flatMap((p, i) => [{ ...p, org: organizations[i % organizations.length].name }]);
  return (
    <SuperShell title="Transactions" subtitle="All inflows across every organization."
      actions={<Button variant="outline" onClick={() => toast.success("Transactions exported")}><Download className="h-4 w-4" /> Export</Button>}>
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
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-5 py-3 font-mono text-xs">{p.id}</td>
                  <td className="px-5 py-3 font-medium">{p.org}</td>
                  <td className="px-5 py-3">{p.vendor}</td>
                  <td className="px-5 py-3 font-mono text-xs">{p.account}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNaira(p.amount)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.date}</td>
                  <td className="px-5 py-3"><StatusBadge status={p.status === "Matched" ? "paid" : p.status === "Overpaid" ? "overpaid" : "partial"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SuperShell>
  );
}
