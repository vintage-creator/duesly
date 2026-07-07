import { createFileRoute } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { StatCard } from "@/components/duesly/stat-card";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Building2, Users, TrendingUp, Activity, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira, formatNumber, monthlyTrend } from "@/lib/sample-data";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { getSuperAdminData } from "@/lib/db-actions";
import { useState } from "react";

export const Route = createFileRoute("/super-admin/")({
  loader: async () => {
    return await getSuperAdminData();
  },
  head: () => ({ meta: [{ title: "Platform overview — Duesly" }] }),
  component: Page,
});

function Page() {
  const { stats, organizations, trend } = Route.useLoaderData();
  const isTrendEmpty = (trend || []).every(t => t.collected === 0);

  const [exporting, setExporting] = useState(false);

  const handleExportPDF = () => {
    if (organizations.length === 0) {
      toast.error("No organizations available to export.");
      return;
    }
    setExporting(true);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 100);
  };

  return (
    <SuperShell title="Platform Overview" subtitle="All organizations powered by Duesly"
      actions={<Button variant="outline" className="cursor-pointer" onClick={handleExportPDF} disabled={organizations.length === 0}><Download className="h-4 w-4" /> {exporting ? "Exporting..." : "Export"}</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Organizations" value={formatNumber(stats.totalOrgs)} delta="+3 this quarter" trend="up" accent="navy" icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Vendors / Members" value={formatNumber(stats.totalMembers)} delta="Across all orgs" accent="info" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Total collected" value={formatNaira(stats.totalCollected)} delta="+18.6% YoY" trend="up" accent="emerald" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Active organizations" value={`${stats.activeOrgs}/${stats.totalOrgs}`} delta={`${Math.round((stats.activeOrgs / stats.totalOrgs) * 100)}% active rate`} accent="gold" icon={<Activity className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Platform-wide collections</h3>
          <p className="text-sm text-muted-foreground">Across all Duesly-powered associations (₦M)</p>
          <div className="mt-4 h-72">
            {stats.totalOrgs === 0 || trend.length === 0 || isTrendEmpty ? (
              <div className="h-full flex flex-col items-center justify-center border border-dashed rounded-2xl bg-secondary/5 text-center p-6">
                <TrendingUp className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-navy">No transaction data</p>
                <p className="text-xs text-muted-foreground max-w-[240px] mt-1 font-sans">Onboard your first client organization to start tracking collection trends.</p>
              </div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ left: -10, right: 10 }}>
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
                  <Area type="monotone" dataKey="collected" stroke="var(--emerald)" strokeWidth={2.5} fill="url(#sg)" name="Collected" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Recent organizations</h3>
          <ul className="mt-4 space-y-3">
            {organizations.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-emerald text-xs font-semibold text-white">{o.name.split(" ").map((w: string) => w[0]).slice(0,2).join("")}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.name}</p>
                  <p className="text-xs text-muted-foreground">{o.type} · {formatNumber(o.vendors)} vendors</p>
                </div>
                <StatusBadge status={o.status as any} />
              </li>
            ))}
            {organizations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No organizations created yet.</p>
            )}
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
                  <td className="px-5 py-3"><StatusBadge status={o.status as any} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
              <span className="text-[10px] border border-slate-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider">PLATFORM DIRECTORY</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mt-2">Duesly Admin Portal</h1>
            <p className="text-xs text-slate-500">Active Tenant Associations Registry</p>
          </div>
          <div className="text-right text-xs text-slate-500 leading-relaxed">
            <p><strong>Total Accounts:</strong> {organizations.length}</p>
            <p><strong>Generated Date:</strong> {new Date().toLocaleDateString("en-NG")}</p>
            <p><strong>System Status:</strong> Operational</p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-700 font-bold uppercase">
              <th className="py-2.5">Org ID</th>
              <th className="py-2.5">Association Name</th>
              <th className="py-2.5">Sector Type</th>
              <th className="py-2.5 text-right font-mono">Members Count</th>
              <th className="py-2.5 text-right font-mono">Lifetime Collections</th>
              <th className="py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((o) => (
              <tr key={o.id} className="border-b border-slate-200 text-slate-800">
                <td className="py-2.5 font-mono text-[10px]">{o.id}</td>
                <td className="py-2.5 font-semibold">{o.name}</td>
                <td className="py-2.5">{o.type}</td>
                <td className="py-2.5 text-right font-mono">{formatNumber(o.vendors)}</td>
                <td className="py-2.5 text-right font-mono font-semibold">₦{Number(o.collected).toLocaleString("en-NG")}</td>
                <td className="py-2.5 font-bold uppercase text-[9px]">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 border-t pt-4 flex justify-between items-center text-[10px] text-slate-500">
          <p>Duesly Platforms Inc · Central Core System Diagnostics</p>
          <p>Page 1 of 1</p>
        </div>
      </div>
    </SuperShell>
  );
}
