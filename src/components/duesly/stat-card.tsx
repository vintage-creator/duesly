import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  accent?: "navy" | "emerald" | "gold" | "info";
  className?: string;
}

const accents = {
  navy: "from-navy/10 to-transparent text-navy",
  emerald: "from-emerald/15 to-transparent text-emerald",
  gold: "from-gold/20 to-transparent text-[color:var(--gold-foreground)]",
  info: "from-info/15 to-transparent text-info",
};

export function StatCard({ label, value, delta, trend = "neutral", icon, accent = "navy", className }: StatCardProps) {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft transition-all hover:shadow-card hover:-translate-y-0.5",
      className,
    )}>
      <div className={cn("pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-60", accents[accent])} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground sm:text-[28px]">{value}</p>
          {delta && (
            <p className={cn(
              "mt-1 text-xs font-medium",
              trend === "up" && "text-emerald",
              trend === "down" && "text-destructive",
              trend === "neutral" && "text-muted-foreground",
            )}>{delta}</p>
          )}
        </div>
        {icon && (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-navy">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
