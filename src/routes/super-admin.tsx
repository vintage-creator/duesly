import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell, superAdminNav } from "@/components/duesly/dashboard-shell";

export const Route = createFileRoute("/super-admin")({
  component: () => <Outlet />,
});

export function SuperShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <DashboardShell
      nav={superAdminNav}
      title={title}
      subtitle={subtitle}
      role="Super Admin"
      user={{ name: "Duesly Operator", initials: "DO" }}
      actions={actions}
    >
      {children}
    </DashboardShell>
  );
}
