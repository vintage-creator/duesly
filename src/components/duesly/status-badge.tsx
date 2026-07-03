import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/sample-data";

const map: Record<string, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-emerald/10 text-emerald ring-emerald/20" },
  partial: { label: "Partial", cls: "bg-warning/15 text-warning-foreground ring-warning/30" },
  unpaid: { label: "Unpaid", cls: "bg-destructive/10 text-destructive ring-destructive/20" },
  overpaid: { label: "Overpaid", cls: "bg-info/10 text-info ring-info/20" },
  matched: { label: "Matched", cls: "bg-emerald/10 text-emerald ring-emerald/20" },
  underpaid: { label: "Underpaid", cls: "bg-warning/15 text-warning-foreground ring-warning/30" },
  review: { label: "Needs Review", cls: "bg-destructive/10 text-destructive ring-destructive/20" },
  active: { label: "Active", cls: "bg-emerald/10 text-emerald ring-emerald/20" },
  pending: { label: "Pending", cls: "bg-warning/15 text-warning-foreground ring-warning/30" },
  suspended: { label: "Suspended", cls: "bg-destructive/10 text-destructive ring-destructive/20" },
  issued: { label: "Issued", cls: "bg-emerald/10 text-emerald ring-emerald/20" },
};

export function StatusBadge({ status, className }: { status: PaymentStatus | string; className?: string }) {
  const key = status.toLowerCase();
  const m = map[key] ?? { label: status, cls: "bg-muted text-muted-foreground ring-border" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", m.cls, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {m.label}
    </span>
  );
}
