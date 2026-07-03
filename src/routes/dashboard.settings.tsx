import { createFileRoute } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — Duesly" }] }),
  component: Page,
});

function Page() {
  return (
    <OrgShell title="Settings" subtitle="Organization profile, branding and notifications.">
      <form className="grid gap-6 lg:grid-cols-3" onSubmit={(e) => { e.preventDefault(); toast.success("Settings saved"); }}>
        <div className="rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
          <h3 className="font-display text-lg font-bold text-navy">Organization profile</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><Label>Organization name</Label><Input defaultValue="Ariaria Market Association" /></div>
            <div><Label>Type</Label><Input defaultValue="Market" /></div>
            <div><Label>Contact email</Label><Input defaultValue="admin@ariariamarket.ng" /></div>
            <div><Label>Phone</Label><Input defaultValue="+234 803 412 9087" /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Input defaultValue="Aba, Abia State" /></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h3 className="font-display text-lg font-bold text-navy">Notifications</h3>
            <div className="mt-3 space-y-3 text-sm">
              {["Daily collection summary","SMS receipts to vendors","Weekly compliance report","Underpayment alerts"].map((l, i) => (
                <label key={l} className="flex items-center justify-between">
                  <span>{l}</span><Switch defaultChecked={i !== 2} />
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h3 className="font-display text-lg font-bold text-navy">Bank settlement</h3>
            <p className="mt-1 text-xs text-muted-foreground">Wema Bank · 0123456789 · Ariaria Market Assoc.</p>
            <Button variant="soft" size="sm" className="mt-3" type="button">Change account</Button>
          </div>
        </div>
        <div className="lg:col-span-3 flex justify-end gap-2">
          <Button variant="ghost" type="button">Discard</Button>
          <Button variant="hero" type="submit">Save changes</Button>
        </div>
      </form>
    </OrgShell>
  );
}
