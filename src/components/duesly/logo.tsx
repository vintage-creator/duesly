import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function DueslyLogo({ className, light = false, collapsed = false }: { className?: string; light?: boolean; collapsed?: boolean }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2 font-display font-bold tracking-tight", className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-emerald shadow-emerald shrink-0">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7c4-4 12-4 16 0" />
          <path d="M4 12c4-4 12-4 16 0" />
          <path d="M4 17c4-4 12-4 16 0" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold ring-2 ring-background" />
      </span>
      {!collapsed && <span className={cn("text-xl", light ? "text-white" : "text-navy")}>Duesly</span>}
    </Link>
  );
}
