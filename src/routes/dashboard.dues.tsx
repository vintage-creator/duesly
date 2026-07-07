import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Send } from "lucide-react";
import { formatNaira, formatNumber } from "@/lib/sample-data";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getDuesCategories, createDueCategory, toggleDueCategory, generateBills } from "@/lib/db-actions";

export const Route = createFileRoute("/dashboard/dues")({
  loader: async () => {
    return await getDuesCategories();
  },
  head: () => ({ meta: [{ title: "Dues & Levies — Duesly" }] }),
  component: Page,
});

function Page() {
  const items = Route.useLoaderData();
  const router = useRouter();

  const [activeOrgId, setActiveOrgId] = useState("ORG-001");
  const [duesList, setDuesList] = useState(items);

  // Create due states
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("Monthly");
  const [targetAccount, setTargetAccount] = useState("Main Settlement Wallet (Nomba)");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Load organization-scoped categories
  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed.org_id && parsed.org_id !== "ORG-001") {
        setActiveOrgId(parsed.org_id);
        getDuesCategories({ data: { orgId: parsed.org_id } })
          .then((res) => {
            setDuesList(res);
          })
          .catch(console.error);
      }
    }
  }, [items]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }
      const res = await createDueCategory({ data: { name, amount: amt, frequency, orgId: activeOrgId, targetAccount } });
      if (res.success) {
        toast.success(`Dues category "${name}" created!`);
        setName("");
        setAmount("");
        setFrequency("Monthly");
        setTargetAccount("Main Settlement Wallet (Nomba)");
        setDialogOpen(false);
        
        getDuesCategories({ data: { orgId: activeOrgId } })
          .then(setDuesList)
          .catch(console.error);
          
        router.invalidate();
      } else {
        toast.error("Could not create dues category");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating dues category");
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const res = await toggleDueCategory({ data: { id, active } });
      if (res.success) {
        toast.success(active ? "Dues category activated!" : "Dues category paused.");
        
        getDuesCategories({ data: { orgId: activeOrgId } })
          .then(setDuesList)
          .catch(console.error);
          
        router.invalidate();
      } else {
        toast.error("Could not update dues category status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating dues category status");
    }
  };

  const handleGenerate = async () => {
    toast.promise(generateBills({ data: { orgId: activeOrgId } }), {
      loading: "Generating bills for all active categories...",
      success: (res) => {
        router.invalidate();
        return `Bills generated successfully: ${formatNaira(res.amountApplied)} applied to all vendors.`;
      },
      error: "Failed to generate bills",
    });
  };

  return (
    <OrgShell
      title="Dues & Levies"
      subtitle="Define what your vendors owe and how often."
      actions={
        <>
          <Button variant="outline" onClick={handleGenerate}><Send className="h-4 w-4" /> Generate Bills</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" /> New Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create dues category</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={handleCreate}>
                <div>
                  <Label>Name</Label>
                  <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sanitation Fee" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Amount (₦)</Label>
                    <Input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" />
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Daily","Weekly","Monthly","Yearly","One-time"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Destination Account</Label>
                  <Select value={targetAccount} onValueChange={setTargetAccount}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Main Settlement Wallet (Nomba)">Main Settlement Wallet (Nomba)</SelectItem>
                      <SelectItem value="Security & Safety Account">Security & Safety Account</SelectItem>
                      <SelectItem value="Development & Project Fund">Development & Project Fund</SelectItem>
                      <SelectItem value="Sanitation & Health Services">Sanitation & Health Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" variant="hero">Save category</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {duesList.map((c) => (
          <div key={c.id} className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft transition-all hover:shadow-card">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald/10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-emerald text-white shadow-emerald">
                <FileText className="h-5 w-5" />
              </div>
              <Switch checked={c.active} onCheckedChange={(v) => handleToggleActive(c.id, v)} />
            </div>
            <h3 className="relative mt-4 font-display text-lg font-bold text-navy">{c.name}</h3>
            <div className="flex flex-col gap-1 items-start">
              <span className="text-[10px] text-muted-foreground">{c.id}</span>
              <span className="text-[10px] font-medium bg-secondary text-navy px-2 py-0.5 rounded-lg border mt-1">
                {(c as any).target_account || "Main Settlement Wallet (Nomba)"}
              </span>
            </div>
            <div className="relative mt-4 flex items-end justify-between">
              <div>
                <p className="font-display text-2xl font-bold text-foreground">{formatNaira(c.amount)}</p>
                <p className="text-xs text-muted-foreground">{c.frequency} · {formatNumber(c.vendors)} vendors</p>
              </div>
              <Button size="sm" variant="soft" onClick={handleGenerate}>Generate</Button>
            </div>
          </div>
        ))}
        {duesList.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            No dues categories configured yet. Click "New Category" to add one.
          </div>
        )}
      </div>
    </OrgShell>
  );
}
