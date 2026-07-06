import { createFileRoute } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { StatusBadge } from "@/components/duesly/status-badge";
import { formatNaira } from "@/lib/sample-data";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { getSuperAdminTransactions } from "@/lib/db-actions";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/super-admin/transactions")({
  loader: async () => {
    return await getSuperAdminTransactions();
  },
  head: () => ({ meta: [{ title: "Transactions — Duesly Admin" }] }),
  component: Page,
});

const formatSignedNaira = (amount: number) => {
  const numericAmount = Number(amount) || 0;
  const sign = numericAmount < 0 ? "-" : "";
  return `${sign}${formatNaira(Math.abs(numericAmount))}`;
};

function Page() {
  const rows = Route.useLoaderData();

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState("all");
  const [exporting, setExporting] = useState(false);

  const filtered = selectedOrg === "all"
    ? rows
    : rows.filter((r: any) => r.org === selectedOrg);

  // Dynamically extract unique tenant organizations from transactions list
  const uniqueOrgs = Array.from(new Set(rows.map((r: any) => r.org))).filter(Boolean);

  const handleExportPDFSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);

    if (filtered.length === 0) {
      toast.error("No transactions found matching the selected organization.");
      setExporting(false);
      return;
    }

    setTimeout(() => {
      window.print();
      setExporting(false);
      setExportDialogOpen(false);
    }, 100);
  };

  return (
    <SuperShell title="Transactions" subtitle="All inflows across every organization."
      actions={<Button variant="outline" className="cursor-pointer" onClick={() => setExportDialogOpen(true)} disabled={rows.length === 0}><Download className="h-4 w-4" /> Export</Button>}>
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
                const isDebit = Number(p.amount) < 0;
                const fee = p.amount * 0.01;
                const net = p.amount * 0.99;
                return (
	                   <tr key={p.id} className={`border-t border-border hover:bg-secondary/40 ${isDebit ? "bg-rose-50/50" : "bg-emerald-50/40"}`}>
                    <td className="px-5 py-3 font-mono text-xs">{p.id}</td>
                    <td className="px-5 py-3 font-medium">{p.org}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{p.vendor}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${isDebit ? "bg-rose-100 text-rose-700" : "bg-emerald/10 text-emerald-700"}`}>
                          {isDebit ? "Debit" : "Credit"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{p.account}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${isDebit ? "text-rose-700" : "text-emerald-700"}`}>
                      {isDebit ? formatSignedNaira(p.amount) : `+${formatNaira(Number(p.amount) || 0)}`}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground font-mono">{formatSignedNaira(fee)}</td>
                    <td className={`px-5 py-3 text-right font-semibold font-mono ${isDebit ? "text-rose-700" : "text-emerald"}`}>{formatSignedNaira(net)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.date}</td>
                    <td className="px-5 py-3"><StatusBadge status={p.status?.toLowerCase() === "matched" || p.status?.toLowerCase() === "paid" ? "paid" : p.status?.toLowerCase() === "overpaid" ? "overpaid" : "partial"} /></td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">
                    No transactions recorded on the platform yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export PDF Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={(o) => !o && setExportDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-navy text-lg">Export Platform Transactions</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExportPDFSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="export-org">Filter by Client Organization</Label>
              <div className="mt-1.5">
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger id="export-org" className="w-full bg-transparent border-border focus:ring-emerald cursor-pointer">
                    <SelectValue placeholder="Select organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">All Organizations</SelectItem>
                    {uniqueOrgs.map((org: any) => (
                      <SelectItem key={org} value={org} className="cursor-pointer">{org}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Filter transactions by tenant association, or export the global platform ledger.</p>
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
              <span className="text-[10px] border border-slate-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider">PLATFORM AUDIT LEDGER</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mt-2">Duesly Admin Portal</h1>
            <p className="text-xs text-slate-500">Cross-Tenant Transaction Log</p>
          </div>
          <div className="text-right text-xs text-slate-500 leading-relaxed">
            <p><strong>Scope Filter:</strong> {selectedOrg === "all" ? "All Association Inflows" : selectedOrg}</p>
            <p><strong>Generated on:</strong> {new Date().toLocaleDateString("en-NG")}</p>
            <p><strong>Auditor Status:</strong> Verified</p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-700 font-bold uppercase">
              <th className="py-2.5">Ref ID</th>
              <th className="py-2.5">Organization</th>
              <th className="py-2.5">Member Name</th>
              <th className="py-2.5">Virtual Account</th>
              <th className="py-2.5 text-right">Amount</th>
              <th className="py-2.5">Date</th>
              <th className="py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-slate-200 text-slate-800">
                <td className="py-2.5 font-mono text-[10px]">{t.id}</td>
                <td className="py-2.5 font-semibold">{t.org}</td>
                <td className="py-2.5">{t.vendor}</td>
                <td className="py-2.5 font-mono">{t.account}</td>
                <td className="py-2.5 text-right font-mono font-semibold">{formatSignedNaira(t.amount)}</td>
                <td className="py-2.5 text-slate-500">{t.date}</td>
                <td className="py-2.5 font-bold uppercase text-[9px]">{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 border-t pt-4 flex justify-between items-center text-[10px] text-slate-500">
          <p>Duesly Platforms Inc · Central Settlement Auditing Service</p>
          <p>Page 1 of 1</p>
        </div>
      </div>
    </SuperShell>
  );
}
