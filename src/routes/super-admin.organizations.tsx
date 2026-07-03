import { createFileRoute } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/duesly/status-badge";
import { organizations, formatNaira, formatNumber } from "@/lib/sample-data";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/organizations")({
  head: () => ({ meta: [{ title: "Organizations — Duesly Admin" }] }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const list = organizations.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <SuperShell title="Organizations" subtitle="Every association onboarded on Duesly."
      actions={<Button variant="hero" onClick={() => toast.success("Onboarding wizard opened")}><Plus className="h-4 w-4" /> Onboard org</Button>}>
      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="border-b border-border p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search organizations…" className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Vendors</th>
                <th className="px-5 py-3 text-right">Collected</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-emerald text-xs font-semibold text-white">{o.name.split(" ").map((w) => w[0]).slice(0,2).join("")}</div>
                      <div><p className="font-medium">{o.name}</p><p className="text-xs text-muted-foreground">{o.id}</p></div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{o.type}</td>
                  <td className="px-5 py-3 text-right">{formatNumber(o.vendors)}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNaira(o.collected)}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => toast.info(`Opening ${o.name}…`)}>Manage</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SuperShell>
  );
}
