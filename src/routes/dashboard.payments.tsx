import { createFileRoute } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/duesly/status-badge";
import { reconciliation, formatNaira } from "@/lib/sample-data";
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/payments")({
  head: () => ({ meta: [{ title: "Payments & Reconciliation — Duesly" }] }),
  component: Page,
});

function Page() {
  const matched = reconciliation.filter((r) => r.status === "matched").length;
  const over = reconciliation.filter((r) => r.status === "overpaid").length;
  const under = reconciliation.filter((r) => r.status === "underpaid").length;
  const review = reconciliation.filter((r) => r.status === "review").length;

  return (
    <OrgShell title="Payments & Reconciliation" subtitle="Every inflow, matched to the right vendor and category."
      actions={<Button variant="outline" onClick={() => toast.success("Manual reconciliation refreshed")}>Refresh feed</Button>}
    >
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
              {reconciliation.map((r) => (
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
                      <Button size="sm" variant="navy" onClick={() => toast.success("Sent to manual review")}>Review</Button>
                    ) : r.status === "overpaid" ? (
                      <Button size="sm" variant="outline" onClick={() => toast.success("Credit applied to next cycle")}>Apply credit</Button>
                    ) : r.status === "underpaid" ? (
                      <Button size="sm" variant="outline" onClick={() => toast.success("Reminder sent")}>Remind</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => toast.success("Receipt re-issued")}>Receipt</Button>
                    )}
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
