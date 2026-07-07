import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Users, Check, ArrowRight } from "lucide-react";
import { NavigationHeader } from "@/components/duesly/header";
import { NavigationFooter } from "@/components/duesly/footer";
import { ScrollTopButton } from "@/components/duesly/scroll-top";

export const Route = createFileRoute("/solutions/trade-groups")({
  head: () => ({ meta: [{ title: "Duesly for Trade Groups" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavigationHeader activeSolution="trade-groups" />

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-emerald text-white shadow-emerald">
              <Users className="h-6 w-6" />
            </div>
            <span className="inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
              Trade Groups & Guilds
            </span>
          </div>
          
          <div className="mt-6 grid gap-12 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7">
              <h1 className="font-display text-3xl font-bold text-navy sm:text-5xl leading-tight">
                Unify dues collections across chapters and branches.
              </h1>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Collect annual membership dues, convention levies, and association license renewals using a dedicated bank account for all their dues and levies mapped directly to each member.
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
                  <span className="font-mono text-[7px]">duesly.app/trade-groups/delegates</span>
                  <span className="w-4" />
                </div>
                {/* Screen Content */}
                <div className="flex-1 p-3 bg-background text-[8px] overflow-hidden flex flex-col justify-between">
                  <div>
                    <h4 className="font-display font-bold text-navy text-xs text-left">Delegate Convention Register</h4>
                    <p className="text-[6px] text-muted-foreground text-left">License compliance across state branch chapters.</p>
                  </div>
                  {/* Mini Table */}
                  <div className="border border-border rounded-md overflow-hidden my-1">
                    <table className="w-full text-left text-[6px]">
                      <thead className="bg-secondary text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-1">Delegate Name</th>
                          <th className="p-1 text-right">Chapter Dues</th>
                          <th className="p-1 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-border">
                          <td className="p-1 font-mono">Hon. Ibrahim (Kano)</td>
                          <td className="p-1 text-right font-bold text-navy">₦50,000</td>
                          <td className="p-1 text-right text-emerald font-semibold">Verified</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {/* Actions */}
                  <div className="flex justify-end gap-1.5 border-t border-border pt-1.5">
                    <Button size="sm" variant="outline" className="h-5 text-[6px] px-1.5">Settings</Button>
                    <Button size="sm" variant="hero" className="h-5 text-[6px] px-1.5">Export PDF</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {[
              { t: "Chapter Segmentation", d: "Track collections across state chapters or trade zones from a single super-admin dashboard view." },
              { t: "Convention Levy Invoicing", d: "Deploy one-off payment categories for special event licenses or annual general assemblies." },
              { t: "Dynamic Transaction Receipts", d: "Deliver transaction confirmations to trade members via email to verify registration at event gates." },
              { t: "Unmatched Ledger Review", d: "Reconcile miscellaneous bank transfers through manual review queues to match unidentified payments." },
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
            <h2 className="font-display text-2xl font-bold text-navy text-center mb-12">How to Onboard Your Trade Guild</h2>
            <div className="grid gap-8 md:grid-cols-4">
              {[
                { s: "Step 1", t: "Define Chapter Structure", d: "Add chapters (e.g. Lagos Chapter, Kano Branch) inside your central Duesly configuration." },
                { s: "Step 2", t: "Load Members database", d: "Bulk import active association members, assigning them to their respective local chapters." },
                { s: "Step 3", t: "Allocate Account Numbers", d: "Duesly sets up unique dedicated payment accounts for each association delegate." },
                { s: "Step 4", t: "Automate settlements", d: "Reconciled funds are automatically consolidated, and chapter coordinators check localized compliance audits." },
              ].map((step, idx) => (
                <div key={idx} className="relative rounded-2xl bg-secondary/35 p-6 border border-border/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald">{step.s}</span>
                  <h4 className="mt-1 font-display font-semibold text-navy text-sm">{step.t}</h4>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{step.d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-3xl bg-gradient-hero p-8 text-center text-white shadow-elevated">
            <h2 className="font-display text-2xl font-bold">Onboard your trade association today</h2>
            <p className="mt-2 text-white/80 max-w-md mx-auto text-sm">Assign dedicated payment account numbers and automate your annual collection reconciliation.</p>
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
