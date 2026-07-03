import { createFileRoute } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Copy, Phone, MapPin } from "lucide-react";
import { vendors, formatNaira, type Vendor } from "@/lib/sample-data";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/vendors")({
  head: () => ({ meta: [{ title: "Vendors & Shops — Duesly" }] }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [active, setActive] = useState<Vendor | null>(null);

  const filtered = useMemo(() => vendors.filter((v) =>
    (status === "all" || v.status === status) &&
    (q === "" || [v.name, v.shop, v.section, v.virtualAccount].some((x) => x.toLowerCase().includes(q.toLowerCase()))),
  ), [q, status]);

  return (
    <OrgShell
      title="Vendors & Shops"
      subtitle="Manage every vendor, their virtual account and balances."
      actions={
        <Dialog>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Add Vendor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add new vendor</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); toast.success("Vendor added & virtual account assigned"); (e.currentTarget.closest('[role="dialog"]') as HTMLElement)?.querySelector<HTMLButtonElement>('button[aria-label="Close"]')?.click(); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Full name</Label><Input required placeholder="e.g. Chinedu Okafor" /></div>
                <div><Label>Phone</Label><Input required placeholder="+234 …" /></div>
                <div><Label>Shop number</Label><Input required placeholder="B-12" /></div>
                <div><Label>Section/Line</Label><Input required placeholder="Textile Line" /></div>
              </div>
              <DialogFooter><Button variant="hero" type="submit">Create vendor</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, shop, section…" className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overpaid">Overpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Virtual a/c</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="cursor-pointer border-t border-border hover:bg-secondary/40" onClick={() => setActive(v)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-emerald text-xs font-semibold text-white">
                        {v.name.split(" ").map((p) => p[0]).slice(0,2).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{v.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{v.shop}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.section}</td>
                  <td className="px-4 py-3 font-mono text-xs">{v.virtualAccount}</td>
                  <td className="px-4 py-3 text-right">{formatNaira(v.due)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatNaira(v.paid)}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">No vendors match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle>{active.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-gradient-hero p-5 text-white">
                  <p className="text-xs uppercase tracking-wider text-white/70">Assigned virtual account</p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="font-display text-2xl font-bold tracking-wider">{active.virtualAccount}</p>
                    <button onClick={() => { navigator.clipboard?.writeText(active.virtualAccount); toast.success("Copied"); }}
                      className="rounded-lg bg-white/15 p-2 hover:bg-white/25"><Copy className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-1 text-xs text-white/70">Wema Bank · Funded by any bank</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Shop" value={active.shop} />
                  <Stat label="Section" value={active.section} />
                  <Stat label="Current bill" value={formatNaira(active.due)} />
                  <Stat label="Amount paid" value={formatNaira(active.paid)} />
                </div>

                <div className="rounded-xl border border-border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
                  <div className="mt-1 flex items-center justify-between">
                    <StatusBadge status={active.status} />
                    <span className="text-muted-foreground inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {active.phone}</span>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-navy">Payment history</p>
                  <div className="space-y-2">
                    {[
                      { d: "12 Jun 2026", a: 18000, c: "Monthly Levy" },
                      { d: "12 May 2026", a: 18000, c: "Monthly Levy" },
                      { d: "12 Apr 2026", a: 18000, c: "Monthly Levy" },
                    ].map((r) => (
                      <div key={r.d} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                        <div>
                          <p className="font-medium">{r.c}</p>
                          <p className="text-xs text-muted-foreground">{r.d}</p>
                        </div>
                        <span className="font-semibold text-emerald">{formatNaira(r.a)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="navy" className="flex-1" onClick={() => toast.success("Receipt sent to vendor")}><MapPin className="h-4 w-4" />Send receipts</Button>
                  <Button variant="outline" onClick={() => toast.info("Reminder queued")}>Remind</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </OrgShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}
