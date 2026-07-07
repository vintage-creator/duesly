import { useEffect, useState } from "react";
import { ArrowRight, Building2, Landmark, ListChecks, ReceiptText } from "lucide-react";

type FlowContext = {
  payerLabel: string; // e.g. "Trader", "Resident", "Member", "Delegate"
  payerIcon?: React.ReactNode;
  accountLabel: string; // e.g. "Shop NUBAN", "House NUBAN"
  amount?: string; // e.g. "₦18,000"
};

const STAGES = [
  { key: "pay", title: "Payment sent", sub: "Direct bank transfer" },
  { key: "account", title: "Virtual account credited", sub: "Instant NUBAN match" },
  { key: "reconcile", title: "Auto-reconciled", sub: "Matched to member ledger" },
  { key: "receipt", title: "Receipt issued", sub: "Sent automatically" },
] as const;

export function PaymentFlowAnimation({ context }: { context: FlowContext }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      setActiveStage((s) => (s + 1) % STAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, [reducedMotion]);

  const icons = [
    context.payerIcon ?? <Building2 className="h-5 w-5" />,
    <Landmark className="h-5 w-5" />,
    <ListChecks className="h-5 w-5" />,
    <ReceiptText className="h-5 w-5" />,
  ];

  const labels = [context.payerLabel, context.accountLabel, "Duesly Ledger", "Receipt"];

  return (
    <div className="pfa-root relative rounded-3xl border border-white/15 bg-white/[0.06] p-5 sm:p-6 backdrop-blur">
      <style>{`
        @keyframes pfa-pulse-node {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16,185,129,0.35); }
          50% { transform: scale(1.06); box-shadow: 0 0 0 8px rgba(16,185,129,0); }
        }
        @keyframes pfa-travel {
          0% { left: 0%; opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes pfa-fade-up {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .pfa-node-active { animation: pfa-pulse-node 1.8s ease-in-out infinite; }
        .pfa-dot { animation: pfa-travel 1.8s linear infinite; }
        .pfa-label-enter { animation: pfa-fade-up 0.4s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .pfa-node-active, .pfa-dot, .pfa-label-enter { animation: none !important; }
        }
      `}</style>

      {/* Amount badge */}
      {context.amount && (
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-white/60">Live example transfer</p>
          <span className="rounded-full bg-emerald/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            {context.amount}
          </span>
        </div>
      )}

      {/* Node row */}
      <div className="relative flex items-center justify-between gap-2">
        {STAGES.map((stage, i) => {
          const isActive = i === activeStage;
          const isPast = reducedMotion ? true : i < activeStage;
          return (
            <div key={stage.key} className="flex flex-1 flex-col items-center gap-2 text-center">
              <div
                className={[
                  "grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-2xl border transition-colors duration-500",
                  isActive || isPast
                    ? "border-emerald/60 bg-emerald text-white"
                    : "border-white/20 bg-white/5 text-white/50",
                  isActive ? "pfa-node-active" : "",
                ].join(" ")}
              >
                {icons[i]}
              </div>
              <div className={isActive ? "pfa-label-enter" : ""}>
                <p className="text-[11px] font-semibold text-white">{labels[i]}</p>
                <p className="hidden sm:block text-[10px] text-white/55">{stage.title}</p>
              </div>
            </div>
          );
        })}

        {/* Connecting line + traveling dot, positioned behind nodes */}
        <div className="pointer-events-none absolute left-[12%] right-[12%] top-[22px] sm:top-[24px] h-[2px] bg-white/15">
          <div className="absolute inset-0 overflow-hidden">
            {!reducedMotion && (
              <span className="pfa-dot absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_8px_2px_rgba(234,179,8,0.6)]" />
            )}
          </div>
        </div>
      </div>

      {/* Status line under the diagram, describes current stage */}
      <div className="mt-6 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5">
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-emerald" />
        <p className="pfa-label-enter text-xs text-white/80">
          <span className="font-semibold text-white">{STAGES[activeStage].title}.</span>{" "}
          {STAGES[activeStage].sub}
        </p>
      </div>
    </div>
  );
}