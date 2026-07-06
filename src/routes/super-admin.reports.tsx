import { createFileRoute, Link } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNaira, formatNumber } from "@/lib/sample-data";
import { Download, BarChart3, Building2, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import { getSuperAdminData } from "@/lib/db-actions";
import { useState, type ReactNode } from "react";

export const Route = createFileRoute("/super-admin/reports")({
  loader: async () => {
    return await getSuperAdminData();
  },
  head: () => ({ meta: [{ title: "Platform reports — Duesly Admin" }] }),
  component: Page,
});

function Page() {
  const { organizations } = Route.useLoaderData();
  const data = organizations.map((o) => ({ 
    name: o.name.split(" ")[0], 
    collected: Math.round(o.collected / 1_000_000) 
  }));
  const isChartEmpty = data.every(item => item.collected === 0);
  const totalCollected = organizations.reduce((sum, org) => sum + Number(org.collected || 0), 0);
  const totalMembers = organizations.reduce((sum, org) => sum + Number(org.vendors || 0), 0);

  const [exporting, setExporting] = useState(false);

  const handleExportPDF = () => {
    if (organizations.length === 0) {
      toast.error("No metrics data available to export.");
      return;
    }
    setExporting(true);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 100);
  };

  if (organizations.length === 0) {
    return (
      <SuperShell title="Platform Reports" subtitle="Collections, growth and compliance across all organizations.">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-soft animate-fade-in-up">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald/10 text-emerald mb-4">
            <BarChart3 className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-bold text-navy">No Tenant Data</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed font-sans">
            There are currently no active tenant organizations onboarded on the platform. Once added, platform-wide compliance data will appear here.
          </p>
          <div className="mt-6">
            <Button variant="hero" className="cursor-pointer" asChild>
              <Link to="/super-admin/organizations">Onboard Organization</Link>
            </Button>
          </div>
        </div>
      </SuperShell>
    );
  }

  return (
    <SuperShell title="Platform Reports" subtitle="Collections, growth and compliance across all organizations."
      actions={<Button variant="hero" className="cursor-pointer" onClick={handleExportPDF} disabled={organizations.length === 0}><Download className="h-4 w-4" /> {exporting ? "Exporting..." : "Export PDF"}</Button>}>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <PlatformMetric icon={<Building2 className="h-5 w-5" />} label="Tenant organizations" value={organizations.length.toString()} tone="navy" />
        <PlatformMetric icon={<Users className="h-5 w-5" />} label="Members tracked" value={formatNumber(totalMembers)} tone="info" />
        <PlatformMetric icon={<CheckCircle2 className="h-5 w-5" />} label="Verified collections" value={formatNaira(totalCollected)} tone="emerald" />
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <h3 className="font-display text-lg font-bold text-navy">Collections by organization (₦M)</h3>
        <div className="mt-4 h-80">
          {isChartEmpty ? (
            <div className="h-full flex flex-col items-center justify-center border border-dashed rounded-2xl bg-secondary/5 text-center p-6">
              <BarChart3 className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold text-navy">No comparative collections yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 font-sans">Once your onboarded organizations log payments, their comparative analytics will render here.</p>
            </div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="collected" fill="var(--emerald)" radius={[6,6,0,0]} name="Collected (₦M)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {organizations.slice(0, 4).map((o) => {
          const statusClass = o.status === "active" ? "bg-emerald/10 text-emerald" : o.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-rose-50 text-rose-600";
          return (
          <div key={o.id} className="rounded-2xl border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{o.type}</p>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>{o.status}</span>
            </div>
            <p className="mt-1 font-display text-base font-bold text-navy truncate" title={o.name}>{o.name}</p>
            <p className="mt-3 font-display text-2xl font-bold">{formatNaira(o.collected)}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(o.vendors)} vendors</p>
          </div>
          );
        })}
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
              <span className="text-[10px] border border-slate-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider">PLATFORM PERFORMANCE REPORT</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mt-2">Duesly Admin Portal</h1>
            <p className="text-xs text-slate-500">Global tenant collections and metric aggregates</p>
          </div>
          <div className="text-right text-xs text-slate-500 leading-relaxed">
            <p><strong>Total Tenants:</strong> {organizations.length}</p>
            <p><strong>Run Date:</strong> {new Date().toLocaleDateString("en-NG")}</p>
            <p><strong>Auditing Node:</strong> Host-1</p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-700 font-bold uppercase">
              <th className="py-2.5">Organization ID</th>
              <th className="py-2.5">Association Name</th>
              <th className="py-2.5">Sector Type</th>
              <th className="py-2.5 text-right font-mono">Members count</th>
              <th className="py-2.5 text-right font-mono">Total Collected</th>
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
                <td className="py-2.5 text-right font-mono font-semibold">{formatNaira(o.collected)}</td>
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

function PlatformMetric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "navy" | "info" | "emerald" }) {
  const toneClasses = {
    navy: "bg-navy/10 text-navy",
    info: "bg-info/10 text-info",
    emerald: "bg-emerald/10 text-emerald"
  };

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${toneClasses[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate font-display text-xl font-bold text-navy">{value}</p>
        </div>
      </div>
    </div>
  );
}
