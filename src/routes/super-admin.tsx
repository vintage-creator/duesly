import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { DashboardShell, superAdminNav } from "@/components/duesly/dashboard-shell";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/super-admin")({
  component: () => <Outlet />,
});

export function SuperShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  const [adminName, setAdminName] = useState("Super Admin");
  const [adminRole, setAdminRole] = useState("Super Admin");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();

  const syncUser = () => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        if (parsed.role === "super-admin") {
          setAdminName(parsed.name || "Super Admin");
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
      if (parsed.role === "super-admin") {
        setAdminName(parsed.name || "Super Admin");
        setAdminRole("Super Admin");
        setAuthorized(true);
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

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-display font-extrabold text-rose-500">Access Denied</h1>
          <p className="text-muted-foreground text-sm leading-relaxed font-sans">
            You do not have the required permissions to access the platform administration panel. Only Super Admins can manage platform-wide operations.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button 
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => {
                const localUser = localStorage.getItem("user");
                if (localUser) {
                  const parsed = JSON.parse(localUser);
                  if (parsed.role === "admin") navigate({ to: "/dashboard" });
                  else if (parsed.role === "vendor") navigate({ to: "/vendor-portal" });
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

  const initials = adminName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <DashboardShell
      nav={superAdminNav}
      title={title}
      subtitle={subtitle}
      role={adminRole}
      user={{ name: adminName, initials }}
      actions={actions}
    >
      {children}
    </DashboardShell>
  );
}
