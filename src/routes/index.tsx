import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DueslyLogo } from "@/components/duesly/logo";
import {
  ArrowRight,
  ShieldCheck,
  Check,
  Building,
  Store,
  Users,
  Handshake,
  BrainCircuit,
  Sparkles,
  Lock,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { NavigationHeader } from "@/components/duesly/header";
import { NavigationFooter } from "@/components/duesly/footer";
import { ScrollTopButton } from "@/components/duesly/scroll-top";
import { subscribeToNewsletter } from "@/lib/db-actions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Duesly — Dedicated Bank Accounts & Levy Reconciliation" },
      { name: "description", content: "Simplified automated collection for associations." },
    ],
  }),
  component: Landing,
});

function AnimatedReconciliationDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const collectedAmount = step < 3 ? 17840000 : 17858000;
  const pendingAmount = step < 3 ? 4560000 : 4542000;

  return (
    <div className="relative w-full max-w-2xl mx-auto select-none">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulseGlow {
          0%, 100% { border-color: rgba(16, 185, 129, 0.2); box-shadow: 0 0 0 rgba(16, 185, 129, 0); }
          50% { border-color: rgba(16, 185, 129, 0.6); box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
        }
        .animate-pulse-glow {
          animation: pulseGlow 2s infinite ease-in-out;
        }
        @keyframes fadeInUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
      `}} />

      {/* Decorative Glows */}
      <div className="absolute -inset-10 rounded-full bg-gradient-to-tr from-emerald/20 to-gold/20 blur-3xl opacity-60 pointer-events-none" />

      {/* Laptop Frame Container (Visible on Desktop) */}
      <div className="hidden md:flex relative mx-auto bg-card border-[10px] border-solid border-navy rounded-2xl shadow-elevated w-full aspect-[16/10] overflow-hidden flex-col text-left">
        {/* Screen Top Bar / Browser Bar */}
        <div className="bg-secondary/80 px-4 py-2 border-b border-border flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
          <div className="flex gap-1.5 items-center">
            <span className="h-2 w-2 rounded-full bg-destructive/60" />
            <span className="h-2 w-2 rounded-full bg-warning/60" />
            <span className="h-2 w-2 rounded-full bg-emerald/60" />
          </div>
          <div className="bg-background border px-4 py-0.5 rounded-md text-[9px] w-64 truncate text-center font-mono">
            duesly.app/dashboard/reconciliation
          </div>
          <span className="w-6" />
        </div>

        {/* Screen Body */}
        <div className="flex-1 bg-background p-4 flex flex-col gap-4 overflow-hidden relative">
          {/* Dashboard Header Inside Screen */}
          <div className="flex items-center justify-between border-b pb-2 shrink-0">
            <div>
              <p className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground">Ariaria Market Association</p>
              <h4 className="font-display text-xs font-extrabold text-navy">Collection Live Ledger</h4>
            </div>
            
            {/* Live Step Badge */}
            <span className={`rounded-full px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider transition-colors duration-300 ${
              step === 0 ? "bg-secondary text-muted-foreground" :
              step === 1 ? "bg-gold/15 text-gold" :
              step === 2 ? "bg-info/15 text-info animate-pulse" :
              "bg-emerald/10 text-emerald"
            }`}>
              {step === 0 && "Step 1: Awaiting payment"}
              {step === 1 && "Step 2: Nomba transfer detected"}
              {step === 2 && "Step 3: Webhook signature verified"}
              {step === 3 && "Step 4: Auto-reconciled"}
            </span>
          </div>

          {/* Mini Stat Cards Row inside Laptop */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="border border-border rounded-xl p-2.5 bg-secondary/35 text-left">
              <p className="text-[7px] text-muted-foreground uppercase font-bold">Total Expected</p>
              <p className="font-display font-bold text-navy text-sm mt-0.5">₦22,400,000</p>
            </div>
            <div className="border border-border rounded-xl p-2.5 bg-secondary/35 text-left transition-all duration-500">
              <p className="text-[7px] text-muted-foreground uppercase font-bold">Collected Dues</p>
              <p className="font-display font-bold text-emerald text-sm mt-0.5">
                ₦{collectedAmount.toLocaleString("en-NG")}
              </p>
            </div>
            <div className="border border-border rounded-xl p-2.5 bg-secondary/35 text-left transition-all duration-500">
              <p className="text-[7px] text-muted-foreground uppercase font-bold">Outstanding</p>
              <p className="font-display font-bold text-gold text-sm mt-0.5">
                ₦{pendingAmount.toLocaleString("en-NG")}
              </p>
            </div>
          </div>

          {/* Vendors & Ledgers Table inside Laptop */}
          <div className="border border-border rounded-xl overflow-hidden flex-1 flex flex-col bg-card">
            <table className="w-full text-left text-[9px] flex-1">
              <thead className="bg-secondary/50 font-bold text-muted-foreground text-[8px] uppercase tracking-wider shrink-0">
                <tr>
                  <th className="p-2">Member / coordinate</th>
                  <th className="p-2">Account Number</th>
                  <th className="p-2 text-right">Levy due</th>
                  <th className="p-2 text-right">Amount paid</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Row 1 (Reconciling row) */}
                <tr className={`transition-all duration-500 ${
                  step >= 2 ? "bg-emerald/5" : ""
                } ${step === 2 ? "animate-pulse-glow border-emerald/40" : ""}`}>
                  <td className="p-2">
                    <p className="font-bold text-navy">Chinedu Okafor</p>
                    <p className="text-[7px] text-muted-foreground">Shop B-12 · Textile</p>
                  </td>
                  <td className="p-2 font-mono text-[8px] text-muted-foreground">9032 1249 84</td>
                  <td className="p-2 text-right font-semibold">₦18,000</td>
                  <td className="p-2 text-right font-bold text-navy transition-all duration-500">
                    ₦{step < 3 ? "0" : "18,000"}
                  </td>
                  <td className="p-2 text-center">
                    <span className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider transition-all duration-500 ${
                      step < 3 ? "bg-warning/15 text-warning" : "bg-emerald/10 text-emerald"
                    }`}>
                      {step < 3 ? "Unpaid" : "Reconciled"}
                    </span>
                  </td>
                </tr>
                {/* Row 2 (Constant paid row) */}
                <tr className="bg-secondary/10">
                  <td className="p-2">
                    <p className="font-bold text-navy">Aisha Bello</p>
                    <p className="text-[7px] text-muted-foreground">Shop C-04 · Provisions</p>
                  </td>
                  <td className="p-2 font-mono text-[8px] text-muted-foreground">9032 1249 85</td>
                  <td className="p-2 text-right font-semibold">₦18,000</td>
                  <td className="p-2 text-right font-bold text-navy">₦18,000</td>
                  <td className="p-2 text-center">
                    <span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider bg-emerald/10 text-emerald">
                      Reconciled
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Floating webhooks toast notification inside Laptop */}
          {step === 1 && (
            <div className="absolute bottom-4 right-4 bg-navy text-white rounded-xl border border-white/10 p-3 shadow-elevated text-[8px] max-w-xs animate-fade-in-up flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gold animate-ping shrink-0" />
              <div>
                <p className="font-bold">Webhook: Nomba Payment</p>
                <p className="text-white/60">₦18,000 transfer captured for account 9032124984.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="absolute bottom-4 right-4 bg-info text-white rounded-xl border border-info/20 p-3 shadow-elevated text-[8px] max-w-xs animate-fade-in-up flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
              <div>
                <p className="font-bold">Signature verification success</p>
                <p className="text-white/80">Headers matched NombaHackathon2026. Resolving ledger...</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="absolute bottom-4 right-4 bg-emerald text-white rounded-xl border border-emerald/20 p-3 shadow-elevated text-[8px] max-w-xs animate-fade-in-up flex items-center gap-2">
              <Check className="h-3 w-3 shrink-0 text-white" />
              <div>
                <p className="font-bold">Ledger matched & receipt dispatched</p>
                <p className="text-white/85">Receipt RCP-8419 sent to chinedu.okafor@gmail.com via Resend.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Laptop Keyboard Base Projection (Visible on Desktop) */}
      <div className="hidden md:block relative mx-auto bg-navy-accent border-x-[12px] border-b-[8px] border-solid border-navy-accent rounded-b-xl shadow-elevated h-3 w-[92%] shrink-0" />

      {/* Mobile Phone Mockup (Visible on Mobile) */}
      <div className="md:hidden flex flex-col items-center py-4">
        <div className="relative border-[6px] border-navy bg-card rounded-[32px] shadow-elevated w-[220px] h-[370px] overflow-hidden flex flex-col p-4 border-solid text-left">
          {/* Speaker notch */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-2.5 bg-navy rounded-full" />
          
          {/* Screen Content */}
          <div className="flex-1 mt-4 flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-center text-[10px] text-muted-foreground pb-1 border-b border-border">
              <span className="font-semibold text-navy text-[9px]">Duesly Pay</span>
              <span>9:41 AM</span>
            </div>
            
            {/* Step 1: Awaiting Payment */}
            {step === 0 && (
              <div className="flex-1 flex flex-col justify-between py-2 animate-fade-in-up">
                <div className="rounded-xl bg-gradient-hero p-3.5 text-white shadow-soft">
                  <p className="text-[7px] uppercase tracking-wider text-white/70">Dedicated Account</p>
                  <p className="font-display font-bold text-sm mt-0.5 tracking-wide">9032 1249 84</p>
                  <p className="text-[6px] text-white/60 mt-0.5">Wema Bank (Powered by Nomba)</p>
                </div>
                <div className="my-2 p-2 bg-secondary/50 rounded-xl border border-border/80 text-center">
                  <p className="text-[8px] text-muted-foreground">Sanitation Levy</p>
                  <p className="font-display font-extrabold text-navy text-base">₦18,000</p>
                  <p className="text-[6px] text-warning font-semibold mt-1 uppercase tracking-wide">Awaiting Payment</p>
                </div>
                <Button size="sm" variant="hero" className="w-full text-[9px] h-7 rounded-lg cursor-pointer">Copy Account</Button>
              </div>
            )}

            {/* Step 2: Transfer Detected */}
            {step === 1 && (
              <div className="flex-1 flex flex-col justify-center items-center py-4 text-center animate-fade-in-up">
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold mb-3 animate-pulse">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
                <h5 className="font-display font-bold text-navy text-xs">Transfer Detected</h5>
                <p className="text-[9px] text-muted-foreground mt-1 max-w-[170px] leading-relaxed">₦18,000 transfer is currently in transit to dedicated account.</p>
              </div>
            )}

            {/* Step 3: Webhook Verification */}
            {step === 2 && (
              <div className="flex-1 flex flex-col justify-center items-center py-4 text-center animate-fade-in-up">
                <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center text-info mb-3">
                  <ShieldCheck className="h-6 w-6 animate-pulse" />
                </div>
                <h5 className="font-display font-bold text-navy text-xs">Securing Settlement</h5>
                <p className="text-[9px] text-muted-foreground mt-1 max-w-[170px] leading-relaxed">Verifying Nomba cryptographic signatures & matching registry.</p>
              </div>
            )}

            {/* Step 4: Reconciled & Receipt */}
            {step === 3 && (
              <div className="flex-1 flex flex-col justify-between py-2 animate-fade-in-up">
                <div className="text-center py-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-emerald/10 flex items-center justify-center text-emerald mb-2">
                    <Check className="h-5 w-5" />
                  </div>
                  <h5 className="font-display font-bold text-navy text-xs">Payment Reconciled</h5>
                  <p className="text-[7px] text-muted-foreground mt-0.5">Receipt RCP-8419 sent successfully.</p>
                </div>
                <div className="p-2 bg-emerald/5 border border-emerald/15 rounded-xl text-center my-1">
                  <p className="text-[6px] text-muted-foreground">Receipt Amount</p>
                  <p className="font-display font-bold text-emerald text-sm">₦18,000</p>
                  <p className="text-[6px] text-emerald font-bold uppercase tracking-wider mt-0.5">Paid Successfully</p>
                </div>
                <Button size="sm" variant="outline" className="w-full text-[9px] h-7 rounded-lg cursor-pointer border-emerald/30 text-emerald hover:bg-emerald/5">View Receipt</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InteractiveAICoachSimulator() {
  const [activeTab, setActiveTab] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [response, setResponse] = useState(
    "Provisions Line C Audit: Sanitation levy collections show a 32% underpayment margin. Analysis indicates this section has the highest rate of manual bank transfers that failed auto-reconciliation due to name mismatches on deposits. We recommend pushing portal lookup SMS notifications to section leaders."
  );

  const QA = [
    {
      question: "Why are Provisions Section collections lagging?",
      answer: "Provisions Line C Audit: Sanitation levy collections show a 32% underpayment margin. Analysis indicates this section has the highest rate of manual bank transfers that failed auto-reconciliation due to name mismatches on deposits. We recommend pushing portal lookup SMS notifications to section leaders."
    },
    {
      question: "How can we improve reconciliation speeds?",
      answer: "Auto-Reconciliation Recommendation: 18% of match queues are caused by vendors transferring from third-party business accounts. Promote copy-NUBAN dedicated account utility cards. Adjust matches to trigger automatic Resend SMS receipts upon Nomba webhook receipt."
    }
  ];

  const handleQuery = (idx: number) => {
    setActiveTab(idx);
    setIsThinking(true);
    setTimeout(() => {
      setResponse(QA[idx].answer);
      setIsThinking(false);
    }, 900);
  };

  return (
    <div className="relative rounded-3xl border border-emerald/20 bg-card p-6 shadow-soft space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-emerald text-white shadow-emerald">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-navy">AI Coach Simulator</h3>
            <p className="text-[10px] text-muted-foreground">Ask Duesly AI about Ariaria Market ledgers</p>
          </div>
        </div>
        <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald">
          Live Preview
        </span>
      </div>

      {/* Admin Question Tabs */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select a sample question:</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {QA.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleQuery(idx)}
              className={`rounded-xl border p-2.5 text-left text-xs transition-all duration-300 cursor-pointer ${
                activeTab === idx
                  ? "border-emerald bg-emerald/5 ring-1 ring-emerald font-semibold text-navy"
                  : "border-border hover:bg-secondary/40 text-muted-foreground"
              }`}
            >
              "{q.question}"
            </button>
          ))}
        </div>
      </div>

      {/* AI Reply Terminal */}
      <div className="rounded-2xl border bg-secondary/30 p-4 min-h-[120px] flex flex-col justify-between relative overflow-hidden">
        {isThinking ? (
          <div className="space-y-2.5 py-2 flex-1">
            <div className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-ping" />
              Thinking & auditing database records...
            </div>
            <div className="h-3 w-11/12 rounded bg-secondary-foreground/10 animate-shimmer" />
            <div className="h-3 w-5/6 rounded bg-secondary-foreground/10 animate-shimmer" />
            <div className="h-3 w-3/4 rounded bg-secondary-foreground/10 animate-shimmer" />
          </div>
        ) : (
          <div className="text-xs leading-relaxed text-muted-foreground animate-fade-in-up">
            <p className="font-bold text-navy mb-1.5">💡 Duesly AI Response:</p>
            <p className="whitespace-pre-line text-[11px]">{response}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Landing() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const [submittingSub, setSubmittingSub] = useState(false);
  const [subTopic, setSubTopic] = useState("Markets");

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("email") as HTMLInputElement;
    if (!input || !input.value) return;

    setSubmittingSub(true);
    try {
      const res = await subscribeToNewsletter({
        data: {
          email: input.value,
          topic: subTopic
        }
      });
      if (res.success) {
        toast.success("Successfully subscribed to Duesly guides!");
        input.value = "";
      } else {
        toast.error(res.error || "Subscription failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error subscribing to newsletter");
    } finally {
      setSubmittingSub(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-emerald selection:text-white">
      <NavigationHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        {/* Abstract Grid Line Pattern */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none select-none">
          <svg className="absolute top-0 left-0 w-full h-full stroke-white/20" fill="none">
            <defs>
              <pattern id="hero-grid" width="60" height="60" patternUnits="userSpaceOnUse" x="50%">
                <path d="M 60 0 L 0 0 0 60" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>
        <svg
          className="absolute inset-x-0 bottom-0 text-background z-10"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M0,64 C240,120 480,0 720,32 C960,64 1200,120 1440,80 L1440,120 L0,120 Z"
          />
        </svg>
        <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-emerald/30 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-10 left-10 h-56 w-56 rounded-full bg-gold/20 blur-3xl animate-float-slow" />

        <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-40 sm:px-6 sm:pt-32 lg:px-8 lg:pt-36">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-white">
              <h1 className="font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Simplify dues collection
                <br className="hidden sm:inline" />{" "}
                <span className="bg-gradient-to-r from-gold via-white to-emerald bg-clip-text text-transparent">
                  for every association.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-white/85 sm:text-lg">
                Duesly automates collection and reconciliation for markets, estates, and cooperatives. Every member gets a dedicated bank account for all their dues, levies, and contributions.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/signup">
                    Start collecting <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  asChild
                >
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>

            {/* Animated Reconciliation Demo Graphics */}
            <div className="relative w-full">
              <AnimatedReconciliationDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Moving Brands Marquee Scroll */}
      <section className="border-y border-border bg-secondary/45 py-6 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-3">
            Organizations managing collections with Duesly
          </p>
          <div className="relative w-full overflow-hidden">
            <div className="flex gap-16 animate-marquee whitespace-nowrap text-navy font-display text-xs font-bold uppercase tracking-wider py-1">
              <span>Ariaria Market Association</span>
              <span>Lekki Phase 1 Estate</span>
              <span>Onitsha Main Market Union</span>
              <span>Trans-Amadi Cooperative</span>
              <span>Magodo Residents Forum</span>
              <span>Alaba International Market</span>
              <span>Kano Leather Traders</span>
              {/* Loop duplicates */}
              <span>Ariaria Market Association</span>
              <span>Lekki Phase 1 Estate</span>
              <span>Onitsha Main Market Union</span>
              <span>Trans-Amadi Cooperative</span>
              <span>Magodo Residents Forum</span>
              <span>Alaba International Market</span>
              <span>Kano Leather Traders</span>
            </div>
          </div>
        </div>
      </section>

      {/* Classy Section 1: How Duesly Works */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-background border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
              Workflow Guide
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl lg:text-4xl">
              Automatic matching in four simple steps.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Duesly replaces manual collection logbooks with localized banking integration and payment auditing.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-4">
            {[
              { num: "01", t: "Setup Association Profile", d: "Configure your association details. Input state branches, zones, and default levy sizes." },
              { num: "02", t: "Import Member Registry", d: "Upload a CSV or Excel file containing member names, shop/house coordinates, and contact details." },
              { num: "03", t: "Allocate Bank Accounts", d: "Each member is allocated a permanent dedicated bank account for all their dues, levies, and contributions." },
              { num: "04", t: "Collect and Reconcile", d: "Members transfer to their NUBAN. Systems auto-reconcile, issuing receipts via Resend alerts." },
            ].map((step, idx) => (
              <div key={idx} className="relative rounded-2xl bg-secondary/30 p-6 border border-border shadow-soft group hover:bg-card transition-colors">
                <span className="font-display text-4xl font-extrabold text-emerald/30 group-hover:text-emerald transition-colors">{step.num}</span>
                <h3 className="mt-4 font-display font-semibold text-navy text-base">{step.t}</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
              Core Capabilities
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl lg:text-4xl">
              Automatic payment tracking. No more paper receipts.
            </h2>
            <p className="mt-4 text-muted-foreground">
              We replace manual collection processes with dedicated bank sub-accounts, matching every transfer instantly to your database registers.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                t: "Dedicated Bank Accounts",
                d: "Onboard members and assign a permanent dedicated bank account for all their dues, levies, and contributions to reconcile collections instantly.",
              },
              {
                t: "Smart Reconciliation",
                d: "Instantly match transfers to bills, tracking partial, complete, and overpayment balances.",
              },
              {
                t: "Digital Receipts",
                d: "Auto-generate and share verified HTML payment confirmations via Resend alerts.",
              },
            ].map((f) => (
              <div
                key={f.t}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-elevated"
              >
                <h3 className="font-display text-lg font-bold text-navy">{f.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Classy Section 2: Security & Bank Compliance */}
      <section className="py-20 bg-navy text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10 grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <span className="inline-flex rounded-full bg-emerald/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
              Bank-Grade Compliance
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              Unmatched ledger security and audit transparency.
            </h2>
            <p className="mt-4 text-sm text-white/80 leading-relaxed">
              We partner directly with Nomba to deliver licensed, secure banking operations. Funds are routed instantly through central settlement rails, ensuring association cash remains safe.
            </p>
            <div className="mt-8 space-y-4">
              {[
                { icon: <Lock className="h-5 w-5 text-emerald" />, title: "Secure End-to-End Encryption", desc: "All merchant registries, bank transfer details, and admin credentials are encrypted." },
                { icon: <RefreshCw className="h-5 w-5 text-emerald" />, title: "Automated Reconciliation Queue", desc: "Unmatched bank transfers trigger alerts in your manual review feed for audit matching." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white">{item.icon}</div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">{item.title}</h4>
                    <p className="text-xs text-white/70 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Security Compliance Graphic */}
          <div className="relative flex justify-center items-center py-10 lg:col-span-1">
            {/* Background glowing rings */}
            <div className="absolute h-72 w-72 rounded-full border border-emerald/20 animate-spin-slow pointer-events-none" />
            <div className="absolute h-56 w-56 rounded-full border border-gold/15 animate-spin-reverse pointer-events-none" />
            
            {/* Glow effects */}
            <div className="absolute h-40 w-40 rounded-full bg-emerald/20 blur-3xl" />

            {/* Central Shield Graphic Container */}
            <div className="relative z-10 bg-navy-accent/50 border border-white/10 rounded-3xl p-6 shadow-elevated backdrop-blur-md w-full max-w-sm flex flex-col items-center justify-center gap-6 text-center">
              <div className="relative h-20 w-20 flex items-center justify-center bg-emerald/10 border border-emerald/30 rounded-2xl animate-pulse">
                <ShieldCheck className="h-10 w-10 text-emerald" />
                {/* Ping rings */}
                <span className="absolute -inset-2 rounded-2xl border border-emerald/40 animate-ping opacity-25" />
              </div>

              <div className="space-y-1">
                <h4 className="font-display font-bold text-base text-white">Nomba Secured Protocol</h4>
                <p className="text-xs text-white/60">Fully licensed settlement rails & dedicated account routing</p>
              </div>

              {/* Badges/Layers Grid */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="rounded-xl border border-white/5 bg-white/5 p-2.5 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gold shrink-0" />
                  <div className="text-[10px] text-left">
                    <p className="font-bold text-white">SSL Encrypted</p>
                    <p className="text-[9px] text-white/50">256-bit AES Layer</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 p-2.5 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald shrink-0" />
                  <div className="text-[10px] text-left">
                    <p className="font-bold text-white">PCI-DSS L1</p>
                    <p className="text-[9px] text-white/50">Card industry standard</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 p-2.5 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-info shrink-0" />
                  <div className="text-[10px] text-left">
                    <p className="font-bold text-white">Realtime Audit</p>
                    <p className="text-[9px] text-white/50">Continuous reconcile</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 p-2.5 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald shrink-0" />
                  <div className="text-[10px] text-left">
                    <p className="font-bold text-white">Vintage Secured</p>
                    <p className="text-[9px] text-white/50">Admin signed logs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Feature Advertisement Section */}
      <section id="ai-features" className="relative py-20 bg-secondary/30 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
                <BrainCircuit className="h-3.5 w-3.5" /> Next-Gen AI
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold text-navy sm:text-3xl lg:text-4xl">
                Meet your automated financial coach.
              </h2>
              <p className="mt-4 text-base text-muted-foreground font-medium">
                Duesly integrates AI to audit your active ledgers. Get instant, actionable recommendations to improve payments, identify lagging sections, and execute recovery strategies.
              </p>
              <div className="mt-6 space-y-4">
                {[
                  "Real-time collection coach recommendations",
                  "Automated identification of unpaid section clusters",
                  "Instant balance sheet exports for audit reconciliation",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald/15 text-emerald">
                      <Sparkles className="h-3 w-3" />
                    </span>
                    <span className="text-sm text-foreground font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:col-span-7 relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-emerald/20 to-gold/25 blur-3xl opacity-60 rounded-3xl" />
              <InteractiveAICoachSimulator />
            </div>
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section id="preview" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
                Product
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl lg:text-4xl">
                One dashboard. Every collection. Total clarity.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Admins see paid, partial, unpaid and overpaid vendors at a glance. Members see what
                they owe and what they've paid — in their pocket.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Live dedicated account balances per vendor",
                  "Category-level breakdown of every collection",
                  "Underpayment and overpayment workflows",
                  "Branded, shareable receipts on every payment",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald/15 text-emerald">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-foreground">{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="navy" asChild>
                  <Link to="/login">Launch Dashboard</Link>
                </Button>
              </div>
            </div>
            <div className="relative rounded-3xl border border-border bg-gradient-to-br from-secondary to-background p-3 shadow-elevated">
              <div className="rounded-2xl bg-card p-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-destructive/60" />
                    <div className="h-3 w-3 rounded-full bg-warning/60" />
                    <div className="h-3 w-3 rounded-full bg-emerald/60" />
                  </div>
                  <p className="text-xs text-muted-foreground">duesly.app/dashboard</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { l: "Expected", v: "₦22.4M", c: "bg-secondary" },
                    { l: "Collected", v: "₦17.8M", c: "bg-emerald/10 text-emerald" },
                    { l: "Outstanding", v: "₦4.6M", c: "bg-warning/15" },
                  ].map((k) => (
                    <div key={k.l} className={`rounded-xl ${k.c} p-3`}>
                      <p className="text-[11px] text-muted-foreground">{k.l}</p>
                      <p className="mt-1 font-display text-lg font-bold">{k.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Matrix Section */}
      <section id="pricing" className="py-20 sm:py-28 bg-secondary/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
              Pricing Plans
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl lg:text-4xl">
              Scalable pricing tailored to your membership.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Simple, transparent pricing that scales with the size of your association. Pay only for the active members you manage.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* Free Tier */}
            <div className="rounded-3xl border border-border bg-card p-8 shadow-soft flex flex-col justify-between relative overflow-hidden">
              <div>
                <h3 className="font-display text-lg font-bold text-navy">Standard</h3>
                <p className="mt-2 text-sm text-muted-foreground">Best for small collection groups. Flat rate billing on bank transfers.</p>
                <div className="mt-4 flex items-baseline">
                  <span className="font-display text-4xl font-bold text-navy">₦100</span>
                  <span className="ml-1.5 text-sm text-muted-foreground">/ transaction</span>
                </div>
                <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
                  {["Up to 100 members max", "Manual account matching", "Standard email receipts", "Daily summary digests"].map((feat) => (
                    <li key={feat} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald" /> {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="hero" className="mt-8 w-full" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>

            {/* Premium Tier */}
            <div className="rounded-3xl border-2 border-emerald bg-card p-8 shadow-soft flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald px-4 py-1 text-[10px] font-bold text-white rounded-bl-xl uppercase tracking-wider">
                Most Popular
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-navy">Professional</h3>
                <p className="mt-2 text-sm text-muted-foreground">Full automation for growing associations.</p>
                <div className="mt-4 flex items-baseline">
                  <span className="font-display text-4xl font-bold text-navy">₦250</span>
                  <span className="ml-1.5 text-sm text-muted-foreground">/ transaction</span>
                </div>
                <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
                  {["Unlimited active members", "AI Collections analyst coach", "Auto SMS & WhatsApp reminders", "Instant bank reconciliation webhooks"].map((feat) => (
                    <li key={feat} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald" /> {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="outline" className="mt-8 w-full border-emerald/30 text-emerald hover:bg-emerald/5 hover:text-emerald" disabled>
                Coming Soon
              </Button>
            </div>

            {/* Custom/Enterprise */}
            <div className="rounded-3xl border border-border bg-card p-8 shadow-soft flex flex-col justify-between relative overflow-hidden">
              <div>
                <h3 className="font-display text-lg font-bold text-navy">Custom</h3>
                <p className="mt-2 text-sm text-muted-foreground">Tailored volume settlement packages.</p>
                <div className="mt-4 flex items-baseline">
                  <span className="font-display text-3xl font-bold text-navy">Volume Rates</span>
                </div>
                <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
                  {["Dedicated sub-account routing", "Direct settlement integrations", "Tailored volume transaction rates", "Dedicated technical support"].map((feat) => (
                    <li key={feat} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald" /> {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="outline" className="mt-8 w-full" asChild>
                <Link to="/contact">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative border-t border-border bg-secondary/15 py-24 overflow-hidden">
        {/* Abstract Background Patterns */}
        <div className="absolute inset-0 z-0 opacity-100 pointer-events-none overflow-hidden select-none">
          {/* Grid Lines */}
          <svg className="absolute top-0 left-0 w-full h-full stroke-navy/15" fill="none">
            <defs>
              <pattern id="faq-grid" width="40" height="40" patternUnits="userSpaceOnUse" x="50%">
                <path d="M 40 0 L 0 0 0 40" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#faq-grid)" />
          </svg>
          {/* Soft Blur Glows */}
          <div className="absolute top-1/4 left-1/4 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-emerald/20 blur-[100px]" />
          <div className="absolute bottom-10 right-1/4 h-[300px] w-[300px] rounded-full bg-gold/25 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="rounded-full bg-emerald/10 px-3.5 py-1 text-xs font-bold text-emerald tracking-wide uppercase">
              Frequently Asked Questions
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-navy sm:text-3xl lg:text-4xl tracking-tight">
              You've got questions. We've got answers.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto">
              Everything you need to know about how Duesly secures your cash, handles compliance, and routes payments.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {[
              {
                q: "What exactly is a dedicated payment account?",
                a: "Instead of dealing with confusing payment setups or local wallets, Duesly assigns a real bank account number uniquely to each member, resident, or shop profile. Members can save this account in their bank apps and transfer money directly to it whenever dues are announced. There is no new app for members to download or figure out."
              },
              {
                q: "Where does the collected money go?",
                a: "All member transfers settle instantly in your organization's secure central Settlement Wallet. To prevent fraud, administrators cannot withdraw these funds to arbitrary personal bank accounts. Payouts can only be routed to confirmed, pre-verified settlement destinations configured during dues creation."
              },
              {
                q: "How does the platform handle underpayments and overpayments?",
                a: "If a member pays less than their active due, Duesly logs their status as 'Partial' and records an outstanding balance. If they pay more, the surplus is logged as an 'Overpayment' credit. Admins can roll this credit over to offset their next payment cycle with a single click, keeping ledgers clean."
              },
              {
                q: "How are payments matched and reconciled?",
                a: "Reconciliation is automatic and instantaneous. When a member makes a bank transfer to their dedicated account number, a payment webhook triggers Duesly to match the account, update the member's ledger, and dispatch a verified receipt via email or SMS. No more manually matching bank alerts to names."
              },
              {
                q: "Is there an setup fee to get onboarded?",
                a: "No! Creating an administrator portal and onboarding your association is free. You only pay platform transaction routing fees when member payments are processed. We scale alongside your community."
              },
              {
                q: "Can members view their payment history?",
                a: "Yes! Every member has access to a secure, private Member Portal. By entering their registered email or phone, they can view their billing history, retrieve their dedicated account details, and download past transaction receipts at any time."
              }
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div 
                  key={idx} 
                  className={`rounded-2xl border bg-card transition-all duration-300 shadow-soft overflow-hidden ${
                    isOpen ? "border-emerald/40 ring-1 ring-emerald/20" : "border-border hover:border-border/80"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between p-5 text-left font-display text-sm sm:text-base font-bold text-navy hover:text-emerald focus:outline-none transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span 
                      className={`ml-4 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary/80 text-navy transition-all duration-300 ${
                        isOpen ? "rotate-180 bg-emerald/15 text-emerald" : ""
                      }`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </span>
                  </button>
                  <div 
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? "max-h-60 border-t border-border/50 bg-secondary/20" : "max-h-0"
                    }`}
                  >
                    <p className="p-5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="border-t border-border bg-background py-16 relative overflow-hidden">
        {/* Soft Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-emerald/5 blur-[120px] pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center z-10">
          <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">
            Get battle-tested strategies to simplify your collections.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Join estate managers, cooperative executives, and market leaders. Get our monthly guides on securing sanitation levies, automating thrift tracking, and preventing collection fraud.
          </p>
          <form 
            onSubmit={handleSubscribe}
            className="mt-6 flex flex-col gap-3 max-w-md mx-auto"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="email" 
                name="email"
                placeholder="Enter your email" 
                required
                className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/80 focus:border-emerald focus:outline-none focus:ring-1 focus:ring-emerald transition-all"
              />
              <select 
                value={subTopic}
                onChange={(e) => setSubTopic(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:border-emerald focus:outline-none focus:ring-1 focus:ring-emerald transition-all cursor-pointer font-medium text-navy"
              >
                <option value="Markets">Markets &amp; Trade Groups</option>
                <option value="Estates">Residential Estates</option>
                <option value="Cooperatives">Cooperatives &amp; Thrift Unions</option>
              </select>
            </div>
            <Button type="submit" variant="hero" disabled={submittingSub} className="w-full rounded-xl py-2.5 cursor-pointer">
              {submittingSub ? "Subscribing..." : "Get Relatable Guide"}
            </Button>
          </form>
        </div>
      </section>

      <NavigationFooter />
      <ScrollTopButton />
    </div>
  );
}
