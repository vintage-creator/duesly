import { createFileRoute, Link } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNaira, monthlyTrend } from "@/lib/sample-data";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Download, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { getDashboardData, getVendors } from "@/lib/db-actions";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [categoryBreakdownData, setCategoryBreakdownData] = useState(categoryBreakdown || []);
  const [trendData, setTrendData] = useState(trend || []);
  const [vendorsList, setVendorsList] = useState(vendors);
  const [hydrating, setHydrating] = useState(true);
  const today = new Date();
  const reportDate = today.toLocaleDateString("en-NG");

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed.org_id) {
        setActiveOrgId(parsed.org_id);
        Promise.all([
          getDashboardData({ data: { orgId: parsed.org_id } }),
          getVendors({ data: { orgId: parsed.org_id } })
        ])
          .then(([data, orgVendors]) => {
            setStatsData(data.stats);
            setCategoryBreakdownData(data.categoryBreakdown || []);
            setTrendData(data.trend || []);
            setVendorsList(orgVendors);
          })
          .catch(console.error)
          .finally(() => setHydrating(false));
      } else {
        setHydrating(false);
      }
    } else {
      setHydrating(false);
    }
  }, [dashboardData, vendors]);
  
  const paidPct = statsData.totalVendors > 0 
    ? Math.round((statsData.paid / statsData.totalVendors) * 100) 
    : 0;

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState("all");
  const [exporting, setExporting] = useState(false);

  const filteredVendors = selectedSection === "all"
    ? vendorsList
    : vendorsList.filter((v: any) => v.section === selectedSection);

  const sections = Array.from(new Set(vendorsList.map((v: any) => v.section).filter(Boolean))).sort();
  const reportScope = `${selectedSection === "all" ? "All sections" : selectedSection} · Live ledger as of ${reportDate}`;

  const handleExportPDFSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);

    if (filteredVendors.length === 0) {
      toast.error("No member metrics found matching the selected section.");
      setExporting(false);
      return;
    }

    setTimeout(() => {
      window.print();
      setExporting(false);
      setExportDialogOpen(false);
    }, 100);
  };

  if (hydrating) {
    return (
      <OrgShell title="Reports" subtitle="Collection insights, compliance and exports.">
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border bg-card shadow-soft">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald border-t-transparent" />
        </div>
      </OrgShell>
    );
  }

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
        <Button variant="hero" className="cursor-pointer" onClick={() => setExportDialogOpen(true)} disabled={vendorsList.length === 0}><Download className="h-4 w-4" /> Export PDF</Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-emerald/10 px-3 py-1 font-semibold text-emerald">Live dashboard data</span>
        <span className="rounded-full bg-secondary px-3 py-1">{reportScope}</span>
      </div>

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

      {/* Export Reports Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={(o) => !o && setExportDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-navy text-lg">Export Compliance Report</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExportPDFSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="export-section">Filter by Section</Label>
              <div className="mt-1.5">
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger id="export-section" className="w-full bg-transparent border-border focus:ring-emerald cursor-pointer">
                    <SelectValue placeholder="Select section..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">All Sections</SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section} value={section} className="cursor-pointer">{section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Select a specific branch or zone section to scope compliance report details.</p>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setExportDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="hero" disabled={exporting} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" /> {exporting ? "Compiling PDF..." : "Export PDF"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              <span className="text-[10px] border border-slate-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider">MEMBER COMPLIANCE REPORT</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mt-2">Duesly Reports Portal</h1>
            <p className="text-xs text-slate-500">Vendor collection compliance & levy audits</p>
          </div>
          <div className="text-right text-xs text-slate-500 leading-relaxed">
            <p><strong>Report Scope:</strong> {reportScope}</p>
            <p><strong>Run Date:</strong> {new Date().toLocaleDateString("en-NG")}</p>
            <p><strong>Status:</strong> Active</p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-700 font-bold uppercase">
              <th className="py-2.5">Member Name</th>
              <th className="py-2.5">Shop / Coord</th>
              <th className="py-2.5">Section</th>
              <th className="py-2.5">Virtual Account</th>
              <th className="py-2.5 text-right">Levy Due</th>
              <th className="py-2.5 text-right">Paid</th>
              <th className="py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.map((v) => (
              <tr key={v.id} className="border-b border-slate-200 text-slate-800">
                <td className="py-2.5 font-semibold">{v.name}</td>
                <td className="py-2.5">{v.shop}</td>
                <td className="py-2.5">{v.section}</td>
                <td className="py-2.5 font-mono text-[10px]">{v.virtualAccount || "N/A"}</td>
                <td className="py-2.5 text-right font-mono">{formatNaira(v.due)}</td>
                <td className="py-2.5 text-right font-mono font-semibold">{formatNaira(v.paid)}</td>
                <td className="py-2.5 font-bold uppercase text-[9px]">{v.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 border-t pt-4 flex justify-between items-center text-[10px] text-slate-500">
          <p>Duesly Platforms Ltd · Compliance Operations</p>
          <p>Page 1 of 1</p>
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
