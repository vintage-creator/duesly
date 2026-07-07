import { createFileRoute, Link } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNaira, formatNumber } from "@/lib/sample-data";
import { Download, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { getSuperAdminData } from "@/lib/db-actions";

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

  const handleExportPDF = () => {
    if (organizations.length === 0) {
      toast.error("No metrics data available to export.");
      return;
    }
    const headers = ["Organization Name", "Type", "Status", "Registered Members", "Reconciled Collections (₦)"];
    const csvRows = [headers.join(",")];
    organizations.forEach(o => {
      csvRows.push([
        `"${o.name}"`,
        o.type,
        o.status,
        o.vendors,
        o.collected
      ].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "duesly_platform_reports_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Platform report metrics downloaded successfully!");
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
      actions={<Button variant="hero" onClick={handleExportPDF} disabled={organizations.length === 0}><Download className="h-4 w-4" /> Export</Button>}>
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
        {organizations.slice(0, 4).map((o) => (
          <div key={o.id} className="rounded-2xl border bg-card p-5 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{o.type}</p>
            <p className="mt-1 font-display text-base font-bold text-navy truncate" title={o.name}>{o.name}</p>
            <p className="mt-3 font-display text-2xl font-bold">{formatNaira(o.collected)}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(o.vendors)} vendors</p>
          </div>
        ))}
      </div>
    </SuperShell>
  );
}
