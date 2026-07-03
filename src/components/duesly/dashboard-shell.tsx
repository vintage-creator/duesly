import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Building2, Users, Receipt, FileBarChart2, Settings, CreditCard,
  Wallet, Bell, Menu, X, Search, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DueslyLogo } from "./logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
}

interface DashboardShellProps {
  nav: NavItem[];
  title: string;
  subtitle?: string;
  role: string;
  user: { name: string; initials: string };
  children: ReactNode;
  actions?: ReactNode;
}

export function DashboardShell({ nav, title, subtitle, role, user, children, actions }: DashboardShellProps) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const bottomNav = nav.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <DueslyLogo light />
        </div>
        <div className="px-4 pt-4 pb-2">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
            <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">{role}</p>
            <p className="mt-0.5 truncate text-sm font-semibold">{user.name}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {nav.map((item) => {
            const active = path === item.to || (item.to !== "/" && path.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-emerald"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <span className="grid h-5 w-5 place-items-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Link to="/login" onClick={() => toast.success("Signed out")} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" /> Sign out
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
              <DueslyLogo light />
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-sidebar-accent"><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {nav.map((item) => {
                const active = path === item.to || (item.to !== "/" && path.startsWith(item.to));
                return (
                  <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
                    )}>
                    <span className="grid h-5 w-5 place-items-center">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-secondary lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden flex-1 max-w-md md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search vendors, payments, receipts..." className="pl-9 bg-secondary/60 border-transparent focus-visible:bg-background" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => toast.info("No new notifications")}>
                <Bell className="h-5 w-5" />
              </Button>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-emerald text-sm font-semibold text-white shadow-emerald">
                {user.initials}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-5">
          {bottomNav.map((item) => {
            const active = path === item.to || (item.to !== "/" && path.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to} className={cn(
                "flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-emerald" : "text-muted-foreground",
              )}>
                <span className={cn("grid h-6 w-6 place-items-center rounded-lg", active && "bg-emerald/10")}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export const orgAdminNav: NavItem[] = [
  { label: "Overview", to: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Vendors", to: "/dashboard/vendors", icon: <Users className="h-4 w-4" /> },
  { label: "Dues & Levies", to: "/dashboard/dues", icon: <Wallet className="h-4 w-4" /> },
  { label: "Payments", to: "/dashboard/payments", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Receipts", to: "/dashboard/receipts", icon: <Receipt className="h-4 w-4" /> },
  { label: "Reports", to: "/dashboard/reports", icon: <FileBarChart2 className="h-4 w-4" /> },
  { label: "Settings", to: "/dashboard/settings", icon: <Settings className="h-4 w-4" /> },
];

export const superAdminNav: NavItem[] = [
  { label: "Overview", to: "/super-admin", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Organizations", to: "/super-admin/organizations", icon: <Building2 className="h-4 w-4" /> },
  { label: "Transactions", to: "/super-admin/transactions", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Reports", to: "/super-admin/reports", icon: <FileBarChart2 className="h-4 w-4" /> },
  { label: "Settings", to: "/super-admin/settings", icon: <Settings className="h-4 w-4" /> },
];
