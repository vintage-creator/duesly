import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Store, Check, ArrowRight } from "lucide-react";
import { NavigationHeader } from "@/components/duesly/header";
import { NavigationFooter } from "@/components/duesly/footer";
import { ScrollTopButton } from "@/components/duesly/scroll-top";

export const Route = createFileRoute("/solutions/markets")({
  head: () => ({ meta: [{ title: "Duesly for Market Unions" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavigationHeader activeSolution="markets" />

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-emerald text-white shadow-emerald">
              <Store className="h-6 w-6" />
            </div>
            <span className="inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
              Market Unions
            </span>
          </div>
          
          <div className="mt-6 grid gap-12 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7">
              <h1 className="font-display text-3xl font-bold text-navy sm:text-5xl leading-tight">
                Streamline collections across thousands of market shops.
              </h1>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Whether managing sprawling market plazas, textile sheds, electronics corridors, or regional trader associations, Duesly allocates a dedicated bank account for all their dues and levies directly to each trader profile to automate your collection pipeline.
              </p>
            </div>
            <div className="lg:col-span-5 flex justify-center">
              {/* Phone Mockup */}
              <div className="relative border-[6px] border-navy bg-card rounded-[32px] shadow-soft w-[180px] h-[320px] overflow-hidden flex flex-col p-3 border-solid text-left">
                {/* Speaker notch */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-navy rounded-full" />
                {/* Screen Content */}
                <div className="flex-1 mt-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[8px] text-muted-foreground pb-1 border-b border-border">
                    <span className="font-semibold text-navy text-[7px]">Duesly Pay</span>
                    <span>9:41 AM</span>
                  </div>
                  
                  {/* Virtual Card */}
                  <div className="rounded-lg bg-gradient-hero p-2 text-white shadow-soft mt-1.5">
                    <p className="text-[6px] uppercase tracking-wider text-white/70">Payment Account</p>
                    <p className="font-display font-bold text-xs mt-0.5 tracking-wide">9032 1249 84</p>
                    <p className="text-[5px] text-white/50 mt-0.5">Wema Bank</p>
                  </div>

                  {/* Info */}
                  <div className="my-1.5 flex-1 flex flex-col justify-center gap-1">
                    <div className="text-center">
                      <p className="text-[7px] text-muted-foreground">Sanitation Levy</p>
                      <p className="font-display font-bold text-navy text-sm">₦18,000</p>
                    </div>
                    <div className="rounded bg-secondary/60 p-1 text-[7px] border border-border/80">
                      <p className="font-semibold text-navy text-[6px]">Trader A (Shop A-01)</p>
                      <p className="text-[5px] text-emerald font-semibold mt-0.5">Assigned Account</p>
                    </div>
                  </div>

                  {/* Action */}
                  <Button variant="hero" className="w-full text-[7px] h-6 rounded-md cursor-pointer">Copy Account</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Value Propositions */}
          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {[
              { t: "Line-by-Line Segmentation", d: "Segment your merchant directory by market sections (e.g. Zone B, Electricals) and monitor compliance percentages automatically." },
              { t: "Dedicated Account Routing", d: "Traders transfer straight to their dedicated account numbers, settling funds directly into your verified union settlement destinations." },
              { t: "Line Leader Audits", d: "Equip section leaders with read-only registers to check who has paid without exposing bank balances or collection details." },
              { t: "Unmatched Ledger Matching", d: "Manually resolve off-register bank transfers with an interactive matching queue, ensuring zero discrepancies." },
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
            <h2 className="font-display text-2xl font-bold text-navy text-center mb-12">How to Onboard Your Market Association</h2>
            <div className="grid gap-8 md:grid-cols-4">
              {[
                { s: "Step 1", t: "Configure Market Profile", d: "Create your union admin portal. Set regular security fees, sanitation levies, and development dues." },
                { s: "Step 2", t: "Import Trader Registry", d: "Upload a simple CSV or Excel file containing trader names, shop codes, sections, and phone numbers." },
                { s: "Step 3", t: "Account Allocation", d: "Duesly automatically provisions dedicated bank account numbers for each trader profile." },
                { s: "Step 4", t: "Real-time Tracking", d: "Traders transfer funds via standard bank apps; payment webhooks trigger, and Duesly reconciles your ledgers instantly." },
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
            <h2 className="font-display text-2xl font-bold">Ready to simplify your market dues?</h2>
            <p className="mt-2 text-white/80 max-w-md mx-auto text-sm">Assign dedicated payment account numbers to all your traders in under 24 hours.</p>
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
