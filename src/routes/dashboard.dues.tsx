import { createFileRoute } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Send } from "lucide-react";
import { duesCategories, formatNaira, formatNumber } from "@/lib/sample-data";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/dues")({
  head: () => ({ meta: [{ title: "Dues & Levies — Duesly" }] }),
  component: Page,
});

function Page() {
  const [items, setItems] = useState(duesCategories);
  return (
    <OrgShell
      title="Dues & Levies"
      subtitle="Define what your vendors owe and how often."
      actions={
        <>
          <Button variant="outline" onClick={() => toast.success("Bills generated for 1,248 vendors")}><Send className="h-4 w-4" /> Generate Bills</Button>
          <Dialog>
            <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> New Category</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create dues category</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); toast.success("Category created"); }}>
                <div><Label>Name</Label><Input required placeholder="e.g. Sanitation Fee" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Amount (₦)</Label><Input type="number" required placeholder="5000" /></div>
                  <div>
                    <Label>Frequency</Label>
                    <Select defaultValue="Monthly"><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Daily","Weekly","Monthly","Yearly","One-time"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter><Button type="submit" variant="hero">Save category</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <div key={c.id} className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft transition-all hover:shadow-card">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald/10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-emerald text-white shadow-emerald">
                <FileText className="h-5 w-5" />
              </div>
              <Switch checked={c.active} onCheckedChange={(v) => {
                setItems((prev) => prev.map((x) => x.id === c.id ? { ...x, active: v } : x));
                toast.success(v ? "Category activated" : "Category paused");
              }} />
            </div>
            <h3 className="relative mt-4 font-display text-lg font-bold text-navy">{c.name}</h3>
            <p className="text-xs text-muted-foreground">{c.id}</p>
            <div className="relative mt-4 flex items-end justify-between">
              <div>
                <p className="font-display text-2xl font-bold text-foreground">{formatNaira(c.amount)}</p>
                <p className="text-xs text-muted-foreground">{c.frequency} · {formatNumber(c.vendors)} vendors</p>
              </div>
              <Button size="sm" variant="soft" onClick={() => toast.success(`Bills generated for ${c.name}`)}>Generate</Button>
            </div>
          </div>
        ))}
      </div>
    </OrgShell>
  );
}
