import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { DashboardShell, orgAdminNav } from "@/components/duesly/dashboard-shell";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getDashboardData } from "@/lib/db-actions";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const [userName, setUserName] = useState("Admin");
  const [userRole, setUserRole] = useState("Organization Admin");
  const [suspended, setSuspended] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [orgType, setOrgType] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  const syncUser = () => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        if (parsed.role === "admin" || parsed.role === "super-admin") {
          setUserName(parsed.name || "Admin");
          setUserRole(parsed.role === "admin" ? "Organization Admin" : "Super Admin");
          setOrgType(parsed.org_type);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    window.addEventListener("user-updated", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (!localUser) {
      navigate({ to: "/login" });
      setLoading(false);
      return;
    }
    try {
      const parsed = JSON.parse(localUser);
      if (parsed.role === "admin" || parsed.role === "super-admin") {
        setUserName(parsed.name || "Admin");
        setUserRole(parsed.role === "admin" ? "Organization Admin" : "Super Admin");
        setOrgType(parsed.org_type);
        setAuthorized(true);
        
        if (parsed.org_id && parsed.role !== "super-admin") {
          getDashboardData({ data: { orgId: parsed.org_id } })
            .then((res) => {
              if (!res.orgName) {
                // Stale session - organization was deleted or database reset
                localStorage.removeItem("user");
                navigate({ to: "/signup" });
                return;
              }
              if (res.orgStatus === "suspended") {
                setSuspended(true);
              }
            })
            .catch(console.error);
        }
      } else {
        setAuthorized(false);
      }
    } catch (e) {
      console.error(e);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  if (suspended) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-display font-extrabold text-rose-500">Access Suspended</h1>
          <p className="text-muted-foreground text-sm leading-relaxed font-sans">
            Your organization account has been suspended by the platform administration. Please contact Duesly support (support@duesly.app) or complete outstanding compliance actions.
          </p>
          <div className="pt-2">
            <Button 
              variant="hero" 
              onClick={() => {
                localStorage.removeItem("user");
                navigate({ to: "/login" });
              }}
            >
              Go back to login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald border-t-transparent" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-display font-extrabold text-rose-500">Access Denied</h1>
          <p className="text-muted-foreground text-sm leading-relaxed font-sans">
            You do not have the required permissions to access the organization dashboard.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button 
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => {
                const localUser = localStorage.getItem("user");
                if (localUser) {
                  const parsed = JSON.parse(localUser);
                  if (parsed.role === "vendor") navigate({ to: "/vendor-portal" });
                  else if (parsed.role === "super-admin") navigate({ to: "/super-admin" });
                  else navigate({ to: "/login" });
                } else {
                  navigate({ to: "/login" });
                }
              }}
            >
              Go to my portal
            </Button>
            <Button 
              variant="hero" 
              onClick={() => {
                localStorage.removeItem("user");
                navigate({ to: "/login" });
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const initials = userName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <DashboardShell
      nav={orgAdminNav}
      role={userRole}
      user={{ name: userName, initials, org_type: orgType }}
    >
      <Outlet />
    </DashboardShell>
  );
}

export function OrgShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </>
  );
}
