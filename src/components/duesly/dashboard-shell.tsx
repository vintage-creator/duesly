import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  LayoutDashboard, Building2, Users, Receipt, FileBarChart2, Settings, CreditCard,
  Wallet, Bell, Menu, X, Search, LogOut, ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DueslyLogo } from "./logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getNotifications, markNotificationRead, clearAllNotifications } from "@/lib/db-actions";

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const bottomNav = nav.slice(0, 5);

  const [activeNotis, setActiveNotis] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotis = () => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      getNotifications({
        data: {
          role: parsed.role || role,
          orgId: parsed.org_id,
          vendorId: parsed.vendor_id
        }
      })
      .then((res) => {
        setActiveNotis(res || []);
        setUnreadCount((res || []).filter((n: any) => !n.read).length);
      })
      .catch(console.error);
    }
  };

  useEffect(() => {
    fetchNotis();
  }, [role, notiOpen]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead({ data: { id } });
      fetchNotis();
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleClearAll = async () => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      try {
        await clearAllNotifications({
          data: {
            role: parsed.role || role,
            orgId: parsed.org_id,
            vendorId: parsed.vendor_id
          }
        });
        toast.success("All notifications cleared!");
        fetchNotis();
      } catch (err) {
        console.error("Failed to clear notifications:", err);
      }
    }
  };

  useEffect(() => {
    const val = localStorage.getItem("sidebar_collapsed") === "true";
    setIsCollapsed(val);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const displayRole = role;

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Desktop sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col bg-sidebar text-sidebar-foreground lg:flex transition-all duration-300 border-r border-sidebar-border/40",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {/* Toggle Button */}
        <button
          onClick={toggleCollapse}
          type="button"
          className="absolute top-20 -right-3 z-40 hidden lg:grid h-6 w-6 place-items-center rounded-full border border-sidebar-border bg-sidebar hover:bg-sidebar-accent text-sidebar-foreground shadow-soft transition-transform duration-300 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        <div className={cn("flex h-16 items-center border-b border-sidebar-border transition-all duration-300", isCollapsed ? "px-3.5 justify-center" : "px-6")}>
          <DueslyLogo light collapsed={isCollapsed} />
        </div>
        <div className={cn("pt-4 pb-2 transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
          <div className={cn("rounded-xl border border-sidebar-border bg-sidebar-accent/60 transition-all duration-300", isCollapsed ? "p-1.5 text-center flex items-center justify-center h-10" : "p-3")}>
            {isCollapsed ? (
              <span className="font-bold text-xs uppercase text-emerald" title={displayRole}>{displayRole.charAt(0)}</span>
            ) : (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">{displayRole}</p>
                <p className="mt-0.5 truncate text-sm font-semibold">{user.name}</p>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {nav.map((item) => {
            const active = item.to === "/super-admin" || item.to === "/dashboard"
              ? path === item.to
              : path === item.to || path.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-300",
                  isCollapsed ? "px-2 justify-center" : "px-3",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-emerald"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="grid h-5 w-5 place-items-center shrink-0">{item.icon}</span>
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Link to="/login" onClick={() => toast.success("Signed out")} className={cn("flex items-center gap-2 rounded-xl py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-all duration-300", isCollapsed ? "justify-center px-1" : "px-3")}>
            <LogOut className="h-4 w-4 shrink-0" /> {!isCollapsed && <span>Sign out</span>}
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
                const active = item.to === "/super-admin" || item.to === "/dashboard"
                  ? path === item.to
                  : path === item.to || path.startsWith(item.to + "/");
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
      <div className={cn("transition-all duration-300", isCollapsed ? "lg:pl-16" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-secondary lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden flex-1 max-w-md md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search vendors, payments, receipts..." className="pl-9 bg-secondary/60 border-transparent focus-visible:bg-background" />
            </div>
            <div className="ml-auto flex items-center gap-2 relative">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative cursor-pointer" 
                  onClick={() => setNotiOpen(!notiOpen)}
                >
                  <Bell className="h-5 w-5 text-navy" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
                  )}
                </Button>
                {notiOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-border bg-card p-3 shadow-elevated z-50 text-left text-xs animate-fade-in-up">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
                      <p className="font-bold text-navy">Platform Alerts ({unreadCount} new)</p>
                      {activeNotis.length > 0 && (
                        <button 
                          className="text-[10px] text-emerald hover:underline font-semibold cursor-pointer" 
                          onClick={handleClearAll}
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {activeNotis.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => handleMarkRead(n.id)}
                          className={cn(
                            "border-b border-border/60 pb-2 last:border-0 last:pb-0 cursor-pointer p-2 rounded-xl transition-colors hover:bg-secondary/40",
                            !n.read ? "bg-emerald/5 border-l-2 border-l-emerald pl-2.5" : ""
                          )}
                        >
                          <p className="font-semibold text-navy text-[11px] flex items-center justify-between">
                            {n.title}
                            {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-emerald" />}
                          </p>
                          <p className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[8px] text-muted-foreground/60 mt-1">
                            {new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      ))}
                      {activeNotis.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground">No platform alerts.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
            const active = item.to === "/super-admin" || item.to === "/dashboard"
              ? path === item.to
              : path === item.to || path.startsWith(item.to + "/");
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
