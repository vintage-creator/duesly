import { createFileRoute } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { organizations, formatNaira, formatNumber } from "@/lib/sample-data";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/reports")({
  head: () => ({ meta: [{ title: "Platform reports — Duesly Admin" }] }),
  component: Page,
});

function Page() {
  const data = organizations.map((o) => ({ name: o.name.split(" ")[0], collected: Math.round(o.collected / 1_000_000) }));
  return (
    <SuperShell title="Platform Reports" subtitle="Collections, growth and compliance across all organizations."
      actions={<Button variant="hero" onClick={() => toast.success("Platform PDF ready")}><Download className="h-4 w-4" /> Export</Button>}>
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <h3 className="font-display text-lg font-bold text-navy">Collections by organization (₦M)</h3>
        <div className="mt-4 h-80">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12 }} />
              <Bar dataKey="collected" fill="var(--emerald)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {organizations.slice(0,4).map((o) => (
          <div key={o.id} className="rounded-2xl border bg-card p-5 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{o.type}</p>
            <p className="mt-1 font-display text-base font-bold text-navy">{o.name}</p>
            <p className="mt-3 font-display text-2xl font-bold">{formatNaira(o.collected)}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(o.vendors)} vendors</p>
          </div>
        ))}
      </div>
    </SuperShell>
  );
}
