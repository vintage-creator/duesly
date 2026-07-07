import { createFileRoute, Link } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNaira, monthlyTrend } from "@/lib/sample-data";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Download, FileDown, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { getDashboardData, getVendors } from "@/lib/db-actions";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/dashboard/reports")({
  loader: async () => {
    const dashboardData = await getDashboardData();
    const vendors = await getVendors();
    return { dashboardData, vendors };
  },
  head: () => ({ meta: [{ title: "Reports — Duesly" }] }),
  component: Page,
});

function Page() {
  const { dashboardData, vendors } = Route.useLoaderData();
  const { stats, categoryBreakdown, trend } = dashboardData;

  const [activeOrgId, setActiveOrgId] = useState("ORG-001");
  const [statsData, setStatsData] = useState(stats);
  const [categoryBreakdownData, setCategoryBreakdownData] = useState(categoryBreakdown);
  const [trendData, setTrendData] = useState(trend || []);
  const [vendorsList, setVendorsList] = useState(vendors);

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed.org_id && parsed.org_id !== "ORG-001") {
        setActiveOrgId(parsed.org_id);
        getDashboardData({ data: { orgId: parsed.org_id } })
          .then((data) => {
            setStatsData(data.stats);
            setCategoryBreakdownData(data.categoryBreakdown);
            setTrendData(data.trend || []);
          })
          .catch(console.error);

        getVendors({ data: { orgId: parsed.org_id } })
          .then(setVendorsList)
          .catch(console.error);
      }
    }
  }, [dashboardData, vendors]);
  
  const paidPct = statsData.totalVendors > 0 
    ? Math.round((statsData.paid / statsData.totalVendors) * 100) 
    : 0;

  const handleCSVExport = () => {
    if (vendorsList.length === 0) {
      toast.error("No vendor metrics available to export.");
      return;
    }
    const headers = ["Vendor Name", "Shop/Coordinate", "Phone Number", "Section", "Account Number", "Levy Due (₦)", "Amount Paid (₦)", "Status"];
    const csvRows = [headers.join(",")];
    vendorsList.forEach(v => {
      csvRows.push([
        `"${v.name}"`,
        `"${v.shop}"`,
        v.phone,
        v.section,
        v.virtualAccount || (v as any).account || "N/A",
        v.due,
        v.paid,
        v.status
      ].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `duesly_vendors_compliance_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV registry compliance report downloaded!");
  };

  const handlePDFPrint = () => {
    if (vendorsList.length === 0) {
      toast.error("No metrics data available to print.");
      return;
    }
    toast.success("Opening print system...");
    setTimeout(() => {
      window.print();
    }, 500);
  };

  if (vendorsList.length === 0) {
    return (
      <OrgShell title="Reports" subtitle="Collection insights, compliance and exports.">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-soft animate-fade-in-up">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald/10 text-emerald mb-4">
            <BarChart3 className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-bold text-navy">No Report Data Available</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed font-sans">
            Once you add members/vendors and they start making transfers to their dedicated payment accounts, your collection compliance analytics will appear here.
          </p>
          <div className="mt-6">
            <Button variant="hero" className="cursor-pointer" asChild>
              <Link to="/dashboard/vendors">Register Members</Link>
            </Button>
          </div>
        </div>
      </OrgShell>
    );
  }

  return (
    <OrgShell title="Reports" subtitle="Collection insights, compliance and exports."
      actions={
        <>
          <Input type="date" defaultValue="2026-06-01" className="w-40" />
          <Input type="date" defaultValue="2026-06-30" className="w-40" />
          <Button variant="outline" onClick={handleCSVExport} disabled={vendorsList.length === 0}><FileDown className="h-4 w-4" /> CSV</Button>
          <Button variant="hero" onClick={handlePDFPrint} disabled={vendorsList.length === 0}><Download className="h-4 w-4" /> PDF</Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Monthly collection summary (₦M)</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="expected" fill="var(--navy)" radius={[6,6,0,0]} name="Expected" />
                <Bar dataKey="collected" fill="var(--emerald)" radius={[6,6,0,0]} name="Collected" />
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
            <Row dot="var(--emerald)" label="Fully paid" value={statsData.paid.toString()} />
            <Row dot="var(--warning)" label="Partially paid" value={statsData.partial.toString()} />
            <Row dot="var(--destructive)" label="Unpaid" value={statsData.unpaid.toString()} />
            <Row dot="var(--info)" label="Overpaid" value={statsData.overpaid.toString()} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Category breakdown</h3>
          <ul className="mt-4 space-y-3">
            {categoryBreakdownData.map((c) => {
              const total = categoryBreakdownData.reduce((s, x) => s + x.value, 0);
              const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
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
            {categoryBreakdownData.length === 0 && (
              <li className="text-sm text-muted-foreground py-4 text-center">No categories configurations found.</li>
            )}
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
                {vendorsList.slice(0, 7).map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="py-2.5 font-medium">{v.name}</td>
                    <td className="py-2.5 text-right">{formatNaira(v.paid)}</td>
                    <td className="py-2.5"><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
                {vendorsList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-muted-foreground">
                      No vendors listed in system.
                    </td>
                  </tr>
                )}
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
