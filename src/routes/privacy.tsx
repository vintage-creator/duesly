import { createFileRoute, Link } from "@tanstack/react-router";
import { NavigationHeader } from "@/components/duesly/header";
import { NavigationFooter } from "@/components/duesly/footer";
import { ScrollTopButton } from "@/components/duesly/scroll-top";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Duesly" }] }),
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>

          <div className="mt-8 prose prose-slate max-w-none text-muted-foreground space-y-6 text-sm leading-relaxed">
            <p>
              At Duesly, we recognize that managing association resources demands absolute transparency and security. This Privacy Policy details how we collect, use, and safeguard personal and financial records to keep your transactions protected.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-6">1. Information We Collect</h2>
            <p>
              To process dedicated account allocations and auto-reconciliation operations, we gather details strictly necessary for ledger compliance:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Administrator Accounts:</strong> Names, work emails, passwords, and organization details to create administrative portals.</li>
              <li><strong>Member / Vendor Registry:</strong> Full names, section tags, shop or house numbers, phone contacts, and email details to allocate ledger profiles.</li>
              <li><strong>Financial Transactions:</strong> Assigned dedicated account details, inbound transfer values, payment categories, settlement statuses, and transaction timestamps.</li>
            </ul>

            <h2 className="font-display text-xl font-bold text-navy mt-6">2. How We Use Information</h2>
            <p>
              We process information solely to deliver automatic settlement and compliance features, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Generating and assigning dedicated payment accounts mapped to member profiles.</li>
              <li>Validating incoming bank transfer notifications via payment webhooks in real-time.</li>
              <li>Sending transaction alert notifications (email receipts or SMS notices) to members.</li>
              <li>Synthesizing collection analytics and compliance reports for organization dashboards.</li>
            </ul>

            <h2 className="font-display text-xl font-bold text-navy mt-6">3. Data Sharing & Third-Party Integrations</h2>
            <p>
              We do not lease, rent, or sell registry data to third-party brokers under any circumstances. Personal and financial records are shared only with licensed payment gateway partners to establish account routing, and transactional communication engines to deliver invoice receipts. All traffic is encrypted in transit via secure HTTPS SSL protocols.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-6">4. Anti-Fraud & Payout Security Controls</h2>
            <p>
              To prevent unauthorized diversion of member dues, Duesly enforces an Anti-Fraud Payout Lock. Administrators cannot withdraw funds directly from their central Settlement Wallet to unverified personal bank accounts. Payouts can only be routed to pre-verified settlement destinations configured during dues category creation.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-6">5. Contact Information</h2>
            <p>
              If you have any questions or complaints about your billing privacy, contact us at <Link to="/contact" className="text-emerald hover:underline">our support desk</Link>. Our team is committed to resolving compliance requests within 24 hours.
            </p>
          </div>
        </div>
      </main>

      <NavigationFooter />
      <ScrollTopButton />
    </div>
  );
}
