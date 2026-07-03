import { createFileRoute, Link } from "@tanstack/react-router";
import { DueslyLogo } from "@/components/duesly/logo";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Copy, MessageCircle, Download, LogOut, Receipt } from "lucide-react";
import { formatNaira } from "@/lib/sample-data";
import { toast } from "sonner";

export const Route = createFileRoute("/vendor-portal")({
  head: () => ({ meta: [{ title: "Vendor Portal — Duesly" }, { name: "description", content: "Track your dues, virtual account, and receipts." }] }),
  component: Page,
});

const vendor = {
  name: "Chinedu Okafor",
  shop: "B-12",
  section: "Textile Line",
  virtualAccount: "9032 4410 88",
  bank: "Wema Bank",
  due: 18000,
  paid: 18000,
  outstanding: 0,
};

const history = [
  { id: "RCP-20451", c: "Monthly Levy", amt: 18000, d: "12 Jun 2026" },
  { id: "RCP-20410", c: "Monthly Levy", amt: 18000, d: "12 May 2026" },
  { id: "RCP-20371", c: "Monthly Levy", amt: 18000, d: "12 Apr 2026" },
  { id: "RCP-20329", c: "Sanitation Fee", amt: 5000, d: "05 Apr 2026" },
];

function Page() {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <DueslyLogo />
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-navy">{vendor.name}</p>
              <p className="text-xs text-muted-foreground">Shop {vendor.shop} · {vendor.section}</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-emerald text-sm font-semibold text-white shadow-emerald">CO</div>
            <Button asChild variant="ghost" size="icon"><Link to="/login"><LogOut className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl bg-gradient-hero p-6 text-white shadow-elevated sm:p-8">
          <p className="text-sm text-white/70">Welcome back,</p>
          <h1 className="font-display text-3xl font-bold">{vendor.name}</h1>
          <p className="mt-1 text-sm text-white/70">Ariaria Market Association · Shop {vendor.shop}</p>

          <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-white/70">Your virtual account · fund from any bank</p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="font-display text-3xl font-bold tracking-wider">{vendor.virtualAccount}</p>
                <p className="mt-0.5 text-xs text-white/70">{vendor.bank} · {vendor.name}</p>
              </div>
              <Button variant="hero" onClick={() => { navigator.clipboard?.writeText(vendor.virtualAccount); toast.success("Account number copied"); }}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card label="Current dues" value={formatNaira(vendor.due)} sub="June 2026 cycle" />
          <Card label="Amount paid" value={formatNaira(vendor.paid)} sub="This cycle" accent="emerald" />
          <Card label="Outstanding" value={formatNaira(vendor.outstanding)} sub={<StatusBadge status="paid" />} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-soft">
            <h3 className="font-display text-lg font-bold text-navy">Payment history & receipts</h3>
            <div className="mt-3 space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald/10 text-emerald"><Receipt className="h-4 w-4" /></div>
                    <div>
                      <p className="text-sm font-medium">{h.c}</p>
                      <p className="text-xs text-muted-foreground">{h.id} · {h.d}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatNaira(h.amt)}</span>
                    <Button size="icon" variant="ghost" onClick={() => toast.success("Receipt downloaded")}><Download className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <h3 className="font-display text-lg font-bold text-navy">Need help?</h3>
              <p className="mt-1 text-sm text-muted-foreground">Reach your association admin directly.</p>
              <Button variant="hero" className="mt-4 w-full" onClick={() => toast.success("Message sent to admin")}>
                <MessageCircle className="h-4 w-4" /> Contact admin
              </Button>
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <h3 className="font-display text-base font-bold text-navy">How to pay</h3>
              <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>1. Open your bank app or USSD.</li>
                <li>2. Transfer to <span className="font-mono text-navy">{vendor.virtualAccount}</span> ({vendor.bank}).</li>
                <li>3. Receive an instant receipt.</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub: React.ReactNode; accent?: "emerald" }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold ${accent === "emerald" ? "text-emerald" : "text-foreground"}`}>{value}</p>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
