import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, FileText, Home, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DueslyLogo } from "@/components/duesly/logo";
import { getReceiptById } from "@/lib/db-actions";
import { getReceiptVerificationCode } from "@/lib/receipt-utils";
import { formatNaira } from "@/lib/sample-data";

export const Route = createFileRoute("/receipts/$receiptId")({
  loader: async ({ params }) => {
    return await getReceiptById({ data: { receiptId: params.receiptId } });
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.receiptId} — Duesly Receipt Verification` },
      { name: "description", content: "Verify a Duesly receipt reference." }
    ]
  }),
  component: PublicReceiptPage,
});

function PublicReceiptPage() {
  const receipt = Route.useLoaderData();
  const verificationCode = receipt ? getReceiptVerificationCode(receipt.id) : "";

  if (!receipt) {
    return (
      <main className="min-h-screen bg-gradient-soft px-4 py-10">
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <FileText className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-navy">Receipt not found</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This receipt reference could not be verified. Check the link or ask the organization admin to resend the receipt.
          </p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/">
              <Home className="h-4 w-4" /> Go home
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-soft px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <DueslyLogo />
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>

        <section className="overflow-hidden rounded-3xl border bg-card shadow-elevated">
          <div className="border-b bg-emerald/8 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald">Verified Receipt</p>
                <h1 className="mt-1 font-display text-2xl font-extrabold text-navy">{receipt.id}</h1>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald/10 px-3 py-1.5 text-xs font-semibold text-emerald">
                <CheckCircle2 className="h-4 w-4" /> Verified by Duesly
              </div>
            </div>
          </div>

          <div className="px-6 py-8 text-center sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount Received</p>
            <p className="mt-2 font-display text-5xl font-extrabold text-navy">{formatNaira(receipt.amount)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Processed securely via Duesly payment infrastructure.</p>
          </div>

          <div className="grid gap-px bg-border sm:grid-cols-2">
            <Detail label="Receipt Reference" value={receipt.id} />
            <Detail label="Verification Code" value={verificationCode} />
            <Detail label="Organization" value={receipt.orgName} />
            <Detail label="Payer" value={receipt.vendor} />
            <Detail label="Category" value={receipt.category} />
            <Detail label="Date" value={receipt.date} />
            <Detail label="Status" value={receipt.status} />
            <Detail label="Payment Rail" value="Nomba MFB Virtual Account" />
          </div>

          <div className="bg-secondary/40 px-6 py-5 text-xs leading-relaxed text-muted-foreground sm:px-8">
            This page confirms that the receipt reference above exists in Duesly's receipt registry. Keep the reference number and verification code for audit and reconciliation checks.
          </div>
        </section>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-6 py-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-navy">{value || "N/A"}</p>
    </div>
  );
}
