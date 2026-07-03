import { createFileRoute } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryBreakdown, vendors, formatNaira, monthlyTrend } from "@/lib/sample-data";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Download, FileDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/reports")({
  head: () => ({ meta: [{ title: "Reports — Duesly" }] }),
  component: Page,
});

function Page() {
  const paidPct = Math.round((812 / 1248) * 100);
  return (
    <OrgShell title="Reports" subtitle="Collection insights, compliance and exports."
      actions={
        <>
          <Input type="date" defaultValue="2026-06-01" className="w-40" />
          <Input type="date" defaultValue="2026-06-30" className="w-40" />
          <Button variant="outline" onClick={() => toast.success("CSV exported")}><FileDown className="h-4 w-4" /> CSV</Button>
          <Button variant="hero" onClick={() => toast.success("PDF report ready")}><Download className="h-4 w-4" /> PDF</Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Monthly collection summary (₦M)</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="expected" fill="var(--navy)" radius={[6,6,0,0]} />
                <Bar dataKey="collected" fill="var(--emerald)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Paid vs Unpaid</h3>
          <div className="relative mx-auto mt-6 grid h-44 w-44 place-items-center">
            <svg viewBox="0 0 36 36" className="h-44 w-44 -rotate-90">
              <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--secondary)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--emerald)" strokeWidth="3"
                strokeDasharray={`${paidPct}, 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute text-center">
              <p className="font-display text-3xl font-bold text-navy">{paidPct}%</p>
              <p className="text-xs text-muted-foreground">Compliance</p>
            </div>
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <Row dot="var(--emerald)" label="Fully paid" value="812" />
            <Row dot="var(--warning)" label="Partially paid" value="264" />
            <Row dot="var(--destructive)" label="Unpaid" value="152" />
            <Row dot="var(--info)" label="Overpaid" value="20" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Category breakdown</h3>
          <ul className="mt-4 space-y-3">
            {categoryBreakdown.map((c) => {
              const total = categoryBreakdown.reduce((s, x) => s + x.value, 0);
              const pct = Math.round((c.value / total) * 100);
              return (
                <li key={c.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">{formatNaira(c.value)} · {pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Vendor compliance</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-2">Vendor</th><th className="py-2 text-right">Paid</th><th className="py-2">Status</th></tr>
              </thead>
              <tbody>
                {vendors.slice(0,7).map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="py-2.5 font-medium">{v.name}</td>
                    <td className="py-2.5 text-right">{formatNaira(v.paid)}</td>
                    <td className="py-2.5"><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </OrgShell>
  );
}

function Row({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
