import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Handshake, Check, ArrowRight } from "lucide-react";
import { NavigationHeader } from "@/components/duesly/header";
import { NavigationFooter } from "@/components/duesly/footer";
import { ScrollTopButton } from "@/components/duesly/scroll-top";

export const Route = createFileRoute("/solutions/cooperatives")({
  head: () => ({ meta: [{ title: "Duesly for Cooperatives" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavigationHeader activeSolution="cooperatives" />

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-emerald text-white shadow-emerald">
              <Handshake className="h-6 w-6" />
            </div>
            <span className="inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
              Cooperatives & Thrifts
            </span>
          </div>
          
          <div className="mt-6 grid gap-12 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7">
              <h1 className="font-display text-3xl font-bold text-navy sm:text-5xl leading-tight">
                Automate member savings and loan contributions.
              </h1>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Reconcile recurring thrift, monthly cooperative contributions, and outstanding loan repayments automatically with a dedicated bank account for all their dues, contributions, and savings assigned to each member.
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
                    <span className="font-semibold text-navy text-[7px]">Coop Savings</span>
                    <span>2:15 PM</span>
                  </div>
                  
                  {/* Account Summary */}
                  <div className="rounded-lg bg-gradient-hero p-2 text-white shadow-soft mt-1.5">
                    <p className="text-[6px] uppercase tracking-wider text-white/70">Cooperative ID</p>
                    <p className="font-display font-bold text-xs mt-0.5 tracking-wide">COOP-MB-481</p>
                    <p className="text-[5px] text-white/50 mt-0.5">Trans-Amadi Union</p>
                  </div>

                  {/* Savings Progress */}
                  <div className="my-1.5 flex-1 flex flex-col justify-center gap-1">
                    <div className="text-center">
                      <p className="text-[7px] text-muted-foreground">Thrift Balance</p>
                      <p className="font-display font-bold text-navy text-sm">₦145,000</p>
                    </div>
                    {/* Simulated Progress bar */}
                    <div className="w-full bg-secondary rounded-full h-1 mt-1">
                      <div className="bg-emerald h-1 rounded-full" style={{ width: "70%" }} />
                    </div>
                    <p className="text-[6px] text-muted-foreground text-center">70% of Annual Thrift Target</p>
                  </div>

                  {/* Action */}
                  <Button variant="hero" className="w-full text-[7px] h-6 rounded-md cursor-pointer">Request Loan Option</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {[
              { t: "Thrift & Savings Tracking", d: "Record member savings accounts dynamically. Deposits made into a member's dedicated account add directly to their savings ledger." },
              { t: "Loan Repayment Auto-Matching", d: "Track outstanding loan margins and auto-apply incoming payments to deduct debt balances before crediting savings." },
              { t: "Annual Dividends Calculation", d: "Access compiled compliance ledgers to calculate member dividends based on total yearly deposits." },
              { t: "Member Balance Portals", d: "Provide cooperative members with their unique portals to track total savings, loans, and download statements." },
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
            <h2 className="font-display text-2xl font-bold text-navy text-center mb-12">How to Manage Your Cooperative Savings</h2>
            <div className="grid gap-8 md:grid-cols-4">
              {[
                { s: "Step 1", t: "Setup Savings Rules", d: "Input your cooperative thrift targets. Set monthly savings values, mandatory share capital, and loan interest rates." },
                { s: "Step 2", t: "Register Members", d: "Upload a list of cooperative members. Add their names, emails, phones, and historical share balances." },
                { s: "Step 3", t: "Allocate Account Numbers", d: "Allocate a designated bank account for each member to deposit monthly contributions directly." },
                { s: "Step 4", t: "Thrift Ledgers Reconciled", d: "Every bank deposit updates the member's savings, loan amortizations, and dividend calculations." },
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
            <h2 className="font-display text-2xl font-bold">Ready to onboard your cooperative or thrift?</h2>
            <p className="mt-2 text-white/80 max-w-md mx-auto text-sm">Create standard thrifts and reconcile recurring savings instantly.</p>
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
