import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell, orgAdminNav } from "@/components/duesly/dashboard-shell";

export const Route = createFileRoute("/dashboard")({
  component: () => <Outlet />,
});

// Shared dashboard wrapper consumed by child pages via context-free pattern:
// each leaf renders <OrgShell title=... subtitle=...>...</OrgShell>
export function OrgShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <DashboardShell
      nav={orgAdminNav}
      title={title}
      subtitle={subtitle}
      role="Organization Admin"
      user={{ name: "Adaeze Okeke", initials: "AO" }}
      actions={actions}
    >
      {children}
    </DashboardShell>
  );
}
