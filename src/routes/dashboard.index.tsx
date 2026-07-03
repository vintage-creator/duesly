import { createFileRoute } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { StatCard } from "@/components/duesly/stat-card";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, AlertCircle, Users, Download, Plus } from "lucide-react";
import { ORG_NAME, formatNaira, formatNumber, orgStats, recentPayments, monthlyTrend, categoryBreakdown } from "@/lib/sample-data";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: `${ORG_NAME} — Duesly` }, { name: "description", content: "Organization dashboard overview." }] }),
  component: Page,
});

function Page() {
  return (
    <OrgShell
      title={ORG_NAME}
      subtitle="June 2026 collection overview"
      actions={
        <>
          <Button variant="outline" onClick={() => toast.success("Report exported")}><Download className="h-4 w-4" /> Export</Button>
          <Button variant="hero" onClick={() => toast.success("Bill generation queued")}><Plus className="h-4 w-4" /> Generate Bills</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Vendors" value={formatNumber(orgStats.totalVendors)} delta="+24 this month" trend="up" accent="navy" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Expected (Jun)" value={formatNaira(orgStats.expected)} delta="Across 6 dues categories" accent="info" icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Collected" value={formatNaira(orgStats.collected)} delta="79% of expected" trend="up" accent="emerald" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Outstanding" value={formatNaira(orgStats.outstanding)} delta="416 vendors owing" trend="down" accent="gold" icon={<AlertCircle className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-navy">Collection trend</h3>
              <p className="text-sm text-muted-foreground">Collected vs expected — last 6 months (₦M)</p>
            </div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <AreaChart data={monthlyTrend} margin={{ left: -10, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--navy)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--navy)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Area type="monotone" dataKey="expected" stroke="var(--navy)" strokeWidth={2} fill="url(#cg2)" />
                <Area type="monotone" dataKey="collected" stroke="var(--emerald)" strokeWidth={2.5} fill="url(#cg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Category breakdown</h3>
          <p className="text-sm text-muted-foreground">Where your collections came from</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                  {categoryBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatNaira(v)} contentStyle={{ borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5">
            {categoryBreakdown.map((c) => (
              <li key={c.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                  <span className="text-foreground">{c.name}</span>
                </span>
                <span className="font-medium text-muted-foreground">{formatNaira(c.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-4">
        {[
          { l: "Paid vendors", v: formatNumber(orgStats.paid), s: "paid" as const },
          { l: "Partially paid", v: formatNumber(orgStats.partial), s: "partial" as const },
          { l: "Unpaid vendors", v: formatNumber(orgStats.unpaid), s: "unpaid" as const },
          { l: "Overpaid vendors", v: formatNumber(orgStats.overpaid), s: "overpaid" as const },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{k.l}</p>
              <StatusBadge status={k.s} />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-foreground">{k.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-bold text-navy">Recent payments</h3>
            <p className="text-sm text-muted-foreground">Latest reconciled inflows</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => toast.info("Opening payments…")}>View all</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Virtual a/c</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-5 py-3 font-medium text-foreground">{p.vendor}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.account}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNaira(p.amount)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.date}</td>
                  <td className="px-5 py-3"><StatusBadge status={p.status === "Matched" ? "paid" : p.status === "Overpaid" ? "overpaid" : "partial"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </OrgShell>
  );
}
