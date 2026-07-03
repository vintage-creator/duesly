import { createFileRoute } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/settings")({
  head: () => ({ meta: [{ title: "Platform settings — Duesly Admin" }] }),
  component: Page,
});

function Page() {
  return (
    <SuperShell title="Platform Settings" subtitle="Manage the Duesly platform configuration.">
      <form className="grid gap-6 lg:grid-cols-2" onSubmit={(e) => { e.preventDefault(); toast.success("Saved"); }}>
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Platform</h3>
          <div className="mt-3 space-y-3">
            <div><Label>Platform name</Label><Input defaultValue="Duesly" /></div>
            <div><Label>Support email</Label><Input defaultValue="support@duesly.app" /></div>
            <div><Label>Platform fee (%)</Label><Input defaultValue="1.0" /></div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold text-navy">Toggles</h3>
          <div className="mt-3 space-y-3 text-sm">
            {["Auto-approve new organizations","Send SMS receipts","Enable USSD payments","Beta: WhatsApp bot"].map((l, i) => (
              <label key={l} className="flex items-center justify-between"><span>{l}</span><Switch defaultChecked={i % 2 === 0} /></label>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost">Discard</Button>
          <Button type="submit" variant="hero">Save</Button>
        </div>
      </form>
    </SuperShell>
  );
}
