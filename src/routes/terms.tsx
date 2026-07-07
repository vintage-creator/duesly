import { createFileRoute, Link } from "@tanstack/react-router";
import { NavigationHeader } from "@/components/duesly/header";
import { NavigationFooter } from "@/components/duesly/footer";
import { ScrollTopButton } from "@/components/duesly/scroll-top";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service — Duesly" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavigationHeader />

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
            Legal & Trust
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold text-navy sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>

          <div className="mt-8 prose prose-slate max-w-none text-muted-foreground space-y-6 text-sm leading-relaxed">
            <p>
              By accessing and using Duesly, you agree to comply with the following Terms of Service. Please read these terms carefully before onboarding your association.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-6">1. Acceptance of Terms</h2>
            <p>
              By creating an administrator account on Duesly, you represent and warrant that you hold authorized legal permission to coordinate collections and manage the financial ledger on behalf of your market union, cooperative, estate, or trade chapter.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-6">2. Fees and Billing</h2>
            <p>
              We charge transaction processing fees on payments completed through member dedicated accounts as specified in our pricing tiers. Platform integrations, including SMS notices, email receipt routing, and dedicated account provisioning, are subject to third-party provider guidelines and operational fees.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-6">3. Use of AI Insights</h2>
            <p>
              Duesly AI analytics and compliance suggestions are provided for informational and coaching support. They do not constitute formal audit reports or legal advice. Administrators maintain final responsibility for auditing database records and matching reconciliation items in the review queue.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-6">4. Anti-Fraud & Settlement Restrictions</h2>
            <p>
              To protect organization collections, Duesly locks administrative settlement payouts. Collected funds cannot be directly transferred out or withdrawn by administrators to arbitrary bank accounts. Direct transfers are only permitted to confirmed, pre-authorized settlement account destinations (e.g. security service providers, waste disposal contractors, or central union treasury) configured during dues creation. Any attempt to route transfers to unverified accounts will result in immediate security holds.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-6">5. Account Suspension & Ledger Freezes</h2>
            <p>
              We reserve the right to suspend or freeze organizations that engage in fraudulent dues creation, or trigger repeated compliance security alerts. Circumvention of anti-fraud payout restrictions will lead to immediate portal access suspension pending Super-Admin validation.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-6">6. Modifications to Service</h2>
            <p>
              We reserve the right to modify or adjust aspects of Duesly at any time. We will provide advance notice of any alterations affecting transaction charges, payout locks, or dedicated account structures.
            </p>
          </div>
        </div>
      </main>

      <NavigationFooter />
      <ScrollTopButton />
    </div>
  );
}
