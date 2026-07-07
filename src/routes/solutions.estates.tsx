import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Building, Check, ArrowRight } from "lucide-react";
import { NavigationHeader } from "@/components/duesly/header";
import { NavigationFooter } from "@/components/duesly/footer";
import { ScrollTopButton } from "@/components/duesly/scroll-top";

export const Route = createFileRoute("/solutions/estates")({
  head: () => ({ meta: [{ title: "Duesly for Residential Estates" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavigationHeader activeSolution="estates" />

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-emerald text-white shadow-emerald">
              <Building className="h-6 w-6" />
            </div>
            <span className="inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
              Residential Estates
            </span>
          </div>
          
          <div className="mt-6 grid gap-12 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7">
              <h1 className="font-display text-3xl font-bold text-navy sm:text-5xl leading-tight">
                Simplify service charges and estate collections.
              </h1>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Duesly automates estate collections by assigning a permanent dedicated bank account for all their dues, maintenance service charges, and security levies to each residential flat unit or block coordinate.
              </p>
            </div>
            <div className="lg:col-span-5 flex justify-center">
              {/* Laptop Mockup */}
              <div className="relative bg-card border-[6px] border-solid border-navy rounded-xl shadow-elevated w-full max-w-sm aspect-[16/10] overflow-hidden flex flex-col text-left">
                {/* Screen Header */}
                <div className="bg-secondary/70 px-3 py-1.5 border-b border-border flex items-center justify-between text-[8px] text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive/60" />
                    <span className="h-1.5 w-1.5 rounded-full bg-warning/60" />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald/60" />
                  </div>
                  <span className="font-mono text-[7px]">duesly.app/estates/block-b</span>
                  <span className="w-4" />
                </div>
                {/* Screen Content */}
                <div className="flex-1 p-3 bg-background text-[8px] overflow-hidden flex flex-col justify-between">
                  <div>
                    <h4 className="font-display font-bold text-navy text-xs text-left">Estate House Register</h4>
                    <p className="text-[6px] text-muted-foreground text-left">Assigned payment accounts per residential flat unit.</p>
                  </div>
                  {/* Mini Table */}
                  <div className="border border-border rounded-md overflow-hidden my-1">
                    <table className="w-full text-left text-[6px]">
                      <thead className="bg-secondary text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-1">House Coordinates</th>
                          <th className="p-1 text-right">Service Dues</th>
                          <th className="p-1 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-border">
                          <td className="p-1 font-mono">Block B, Villa 12</td>
                          <td className="p-1 text-right font-bold text-navy">₦35,000</td>
                          <td className="p-1 text-right text-emerald font-semibold">Reconciled</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {/* Actions */}
                  <div className="flex justify-end gap-1.5 border-t border-border pt-1.5">
                    <Button size="sm" variant="outline" className="h-5 text-[6px] px-1.5">Settings</Button>
                    <Button size="sm" variant="hero" className="h-5 text-[6px] px-1.5">Audit Ledger</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {[
              { t: "Flat/Block Coordinates Mapping", d: "Map dedicated account numbers directly to physical house addresses (e.g. Block C, Villa 10). Account numbers persist during lease handovers to simplify tenant setups." },
              { t: "Target Account Allocations", d: "Route incoming maintenance payments directly to the designated estate project accounts (e.g. Sanitation Account vs. Security Fund)." },
              { t: "Cleared Security Passes", d: "Instantly flag payments as reconciled, allowing gate security operators to verify access permissions in real-time." },
              { t: "Resident Reminders", d: "Automatically distribute polite outstanding balance alerts via email or SMS, keeping cash flows active." },
            ].map((sol, idx) => (
              <div key={idx} className="rounded-2xl border bg-card p-6 shadow-soft hover:shadow-elevated transition-shadow">
                <h3 className="font-display text-lg font-bold text-navy flex items-center gap-2">
                  <Check className="h-5 w-5 text-emerald" /> {sol.t}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{sol.d}</p>
              </div>
            ))}
          </div>

          {/* Onboarding Guide */}
          <div className="mt-20 border-t border-border/80 pt-16">
            <h2 className="font-display text-2xl font-bold text-navy text-center mb-12">How to Manage Your Estate Levies</h2>
            <div className="grid gap-8 md:grid-cols-4">
              {[
                { s: "Step 1", t: "Setup Estate Profile", d: "Register your administrative portal on Duesly. Add security charges, waste disposal rates, or project levies." },
                { s: "Step 2", t: "Map House Registry", d: "Import flat numbers, block codes, and resident contact coordinates (email/phone) to establish billing." },
                { s: "Step 3", t: "Account Allocation", d: "Each physical address is allocated a dedicated bank account number which persists across tenant swaps." },
                { s: "Step 4", t: "Auto-Reconcile Bills", d: "Residents transfer dues from their own banking apps. Duesly resolves the billing ledger instantly." },
              ].map((step, idx) => (
                <div key={idx} className="relative rounded-2xl bg-secondary/35 p-6 border border-border/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald">{step.s}</span>
                  <h4 className="mt-1 font-display font-semibold text-navy text-sm">{step.t}</h4>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{step.d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 rounded-3xl bg-gradient-hero p-8 text-center text-white shadow-elevated">
            <h2 className="font-display text-2xl font-bold">Ready to simplify your estate levies?</h2>
            <p className="mt-2 text-white/80 max-w-md mx-auto text-sm">Assign dedicated bank account numbers to all house coordinates in under 24 hours.</p>
            <Button variant="hero" className="mt-6" asChild>
              <Link to="/signup">Launch Your Portal <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </main>

      <NavigationFooter />
      <ScrollTopButton />
    </div>
  );
}
