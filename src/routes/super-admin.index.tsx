import { createFileRoute } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { StatCard } from "@/components/duesly/stat-card";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Building2, Users, TrendingUp, Activity, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { organizations, platformStats, formatNaira, formatNumber, monthlyTrend } from "@/lib/sample-data";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/")({
  head: () => ({ meta: [{ title: "Platform overview — Duesly" }] }),
  component: Page,
});

function Page() {
  return (
    <SuperShell title="Platform Overview" subtitle="All organizations powered by Duesly"
      actions={<Button variant="outline" onClick={() => toast.success("Platform report exported")}><Download className="h-4 w-4" /> Export</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Organizations" value={formatNumber(platformStats.totalOrgs)} delta="+3 this quarter" trend="up" accent="navy" icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Vendors / Members" value={formatNumber(platformStats.totalMembers)} delta="Across all orgs" accent="info" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Total collected" value={formatNaira(platformStats.totalCollected)} delta="+18.6% YoY" trend="up" accent="emerald" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Active organizations" value={`${platformStats.activeOrgs}/${platformStats.totalOrgs}`} delta="87% active rate" accent="gold" icon={<Activity className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Platform-wide collections</h3>
          <p className="text-sm text-muted-foreground">Across all Duesly-powered associations (₦M)</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <AreaChart data={monthlyTrend.map((m) => ({ ...m, collected: m.collected * 12, expected: m.expected * 12 }))} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Area type="monotone" dataKey="collected" stroke="var(--emerald)" strokeWidth={2.5} fill="url(#sg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Recent organizations</h3>
          <ul className="mt-4 space-y-3">
            {organizations.slice(0,5).map((o) => (
              <li key={o.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-emerald text-xs font-semibold text-white">{o.name.split(" ").map((w) => w[0]).slice(0,2).join("")}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.name}</p>
                  <p className="text-xs text-muted-foreground">{o.type} · {formatNumber(o.vendors)} vendors</p>
                </div>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-card shadow-soft">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-display text-lg font-bold text-navy">Organization status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Vendors</th>
                <th className="px-5 py-3 text-right">Collected (lifetime)</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-5 py-3 font-medium">{o.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{o.type}</td>
                  <td className="px-5 py-3 text-right">{formatNumber(o.vendors)}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNaira(o.collected)}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SuperShell>
  );
}
