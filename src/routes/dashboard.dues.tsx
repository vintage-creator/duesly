import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Send, Trash2, Edit2 } from "lucide-react";
import { formatNaira, formatNumber } from "@/lib/sample-data";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getDuesCategories, createDueCategory, toggleDueCategory, generateBills, deleteDueCategory, updateDueCategory } from "@/lib/db-actions";

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
  const [duesList, setDuesList] = useState(items || []);
  const [hydrating, setHydrating] = useState(true);

  // Create due states
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("Monthly");
  const [targetAccount, setTargetAccount] = useState("Main Settlement Wallet (Nomba)");
  const [destBank, setDestBank] = useState("");
  const [destAccount, setDestAccount] = useState("");
  const [destName, setDestName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  // Edit form states
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editFrequency, setEditFrequency] = useState("Monthly");
  const [editTargetAccount, setEditTargetAccount] = useState("Main Settlement Wallet (Nomba)");
  const [editDestBank, setEditDestBank] = useState("");
  const [editDestAccount, setEditDestAccount] = useState("");
  const [editDestName, setEditDestName] = useState("");

  // Load organization-scoped categories
  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed.org_id) {
        setActiveOrgId(parsed.org_id);
        getDuesCategories({ data: { orgId: parsed.org_id } })
          .then((res) => {
            setDuesList(res);
          })
          .catch(console.error)
          .finally(() => setHydrating(false));
      } else {
        setHydrating(false);
      }
    } else {
      setHydrating(false);
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
      const res = await createDueCategory({ 
        data: { 
          name, 
          amount: amt, 
          frequency, 
          orgId: activeOrgId, 
          targetAccount,
          destinationBank: targetAccount === "Custom Bank Account (Direct Settlement)" ? destBank : undefined,
          destinationAccount: targetAccount === "Custom Bank Account (Direct Settlement)" ? destAccount : undefined,
          destinationName: targetAccount === "Custom Bank Account (Direct Settlement)" ? destName : undefined,
        } 
      });
      if (res.success) {
        toast.success(`Dues category "${name}" created!`);
        setName("");
        setAmount("");
        setDestBank("");
        setDestAccount("");
        setDestName("");
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

  const handleGenerate = async (categoryId?: string) => {
    toast.promise(generateBills({ data: { orgId: activeOrgId, categoryId } }), {
      loading: categoryId 
        ? "Generating bills for this category..." 
        : "Generating bills for all active categories...",
      success: (res: any) => {
        router.invalidate();
        return categoryId
          ? `Bills generated successfully: ${formatNaira(res.amountApplied)} applied to all vendors for ${res.categoryName}.`
          : `Bills generated successfully: ${formatNaira(res.amountApplied)} applied to all vendors.`;
      },
      error: "Failed to generate bills",
    });
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await deleteDueCategory({ data: { id: deleteId } });
      if (res.success) {
        toast.success("Dues category deleted successfully!");
        setDeleteId(null);
        getDuesCategories({ data: { orgId: activeOrgId } })
          .then(setDuesList)
          .catch(console.error);
        router.invalidate();
      } else {
        toast.error("Could not delete dues category");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting dues category");
    }
  };

  const handleOpenEdit = (c: any) => {
    setEditingCategory(c);
    setEditName(c.name);
    setEditAmount(String(c.amount));
    setEditFrequency(c.frequency);
    if (c.destinationAccount) {
      setEditTargetAccount("Custom Bank Account (Direct Settlement)");
      setEditDestBank(c.destinationBank || "");
      setEditDestAccount(c.destinationAccount || "");
      setEditDestName(c.destinationName || "");
    } else {
      setEditTargetAccount("Main Settlement Wallet (Nomba)");
      setEditDestBank("");
      setEditDestAccount("");
      setEditDestName("");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    try {
      const isCustom = editTargetAccount === "Custom Bank Account (Direct Settlement)";
      const res = await updateDueCategory({
        data: {
          id: editingCategory.id,
          name: editName,
          amount: numAmount,
          frequency: editFrequency,
          targetAccount: isCustom ? `Settles directly: ${editDestBank}` : "Main Settlement Wallet (Nomba)",
          destinationBank: isCustom ? editDestBank : undefined,
          destinationAccount: isCustom ? editDestAccount : undefined,
          destinationName: isCustom ? editDestName : undefined,
        }
      });
      if (res.success) {
        toast.success("Dues category updated successfully!");
        setEditingCategory(null);
        getDuesCategories({ data: { orgId: activeOrgId } })
          .then(setDuesList)
          .catch(console.error);
        router.invalidate();
      } else {
        toast.error("Could not update dues category");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating dues category");
    }
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
                      <SelectItem value="Main Settlement Wallet (Nomba)">Main Settlement Wallet (Nomba) (HQ)</SelectItem>
                      <SelectItem value="Custom Bank Account (Direct Settlement)">Custom Bank Account (Direct Settlement)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {targetAccount === "Custom Bank Account (Direct Settlement)" && (
                  <div className="space-y-3 rounded-xl border bg-slate-50/50 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Select Bank</Label>
                        <Select value={destBank} onValueChange={setDestBank}>
                          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Choose bank" /></SelectTrigger>
                          <SelectContent>
                            {["Access Bank", "Guaranty Trust Bank", "Zenith Bank", "United Bank for Africa", "Wema Bank", "Sterling Bank", "Fidelity Bank", "First Bank"].map((b) => (
                              <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Account Number</Label>
                        <Input 
                          required 
                          maxLength={10} 
                          value={destAccount} 
                          onChange={(e) => setDestAccount(e.target.value.replace(/\D/g, ""))} 
                          className="mt-1 h-8 text-xs" 
                          placeholder="e.g. 0123456789" 
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Account Name</Label>
                      <Input 
                        required 
                        value={destName} 
                        onChange={(e) => setDestName(e.target.value)} 
                        className="mt-1 h-8 text-xs" 
                        placeholder="e.g. Sanitation Contractor Ltd" 
                      />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit" variant="hero">Save category</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      {hydrating ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border bg-card shadow-soft">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald border-t-transparent" />
        </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {duesList.map((c) => (
          <div key={c.id} className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft transition-all hover:shadow-card">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald/10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-emerald text-white shadow-emerald">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={c.active} onCheckedChange={(v) => handleToggleActive(c.id, v)} />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                  onClick={() => handleOpenEdit(c)}
                  title="Edit category"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                  onClick={() => handleDelete(c.id)}
                  title="Delete category"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <h3 className="relative mt-4 font-display text-lg font-bold text-navy">{c.name}</h3>
            <div className="flex flex-col gap-1 items-start">
              <span className="text-[10px] text-muted-foreground">{c.id}</span>
              {c.destinationAccount ? (
                <span className="text-[10px] font-medium bg-emerald/10 text-emerald-700 border-emerald-200/50 px-2 py-0.5 rounded-lg border mt-1 truncate max-w-full">
                  Settles: {c.destinationBank} · {c.destinationAccount} ({c.destinationName})
                </span>
              ) : (
                <span className="text-[10px] font-medium bg-secondary text-navy px-2 py-0.5 rounded-lg border mt-1">
                  {c.targetAccount || "Main Settlement Wallet (Nomba)"}
                </span>
              )}
            </div>
            <div className="relative mt-4 flex items-end justify-between">
              <div>
                <p className="font-display text-2xl font-bold text-foreground">{formatNaira(c.amount)}</p>
                <p className="text-xs text-muted-foreground">{c.frequency} · {formatNumber(c.vendors)} vendors</p>
              </div>
              <Button size="sm" variant="soft" onClick={() => handleGenerate(c.id)}>Generate</Button>
            </div>
          </div>
        ))}
        {duesList.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            No dues categories configured yet. Click "New Category" to add one.
          </div>
        )}
      </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dues Category</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Are you sure you want to permanently delete this dues category? This action cannot be undone and will remove this category from future billing.
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="cursor-pointer">Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} className="cursor-pointer">Delete Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Dues Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label>Category name</Label>
              <Input required value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount (₦)</Label>
                <Input required type="number" min="1" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Billing Frequency</Label>
                <Select value={editFrequency} onValueChange={setEditFrequency}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Settlement Wallet / Target Account</Label>
              <Select value={editTargetAccount} onValueChange={setEditTargetAccount}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Main Settlement Wallet (Nomba)">Main Settlement Wallet (Nomba)</SelectItem>
                  <SelectItem value="Custom Bank Account (Direct Settlement)">Custom Bank Account (Direct Settlement)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editTargetAccount === "Custom Bank Account (Direct Settlement)" && (
              <div className="space-y-3 rounded-2xl border bg-secondary/30 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Destination Bank</Label>
                    <Select value={editDestBank} onValueChange={setEditDestBank}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select bank" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Access Bank">Access Bank</SelectItem>
                        <SelectItem value="GTBank">Guaranty Trust Bank</SelectItem>
                        <SelectItem value="Zenith Bank">Zenith Bank</SelectItem>
                        <SelectItem value="United Bank for Africa">United Bank for Africa (UBA)</SelectItem>
                        <SelectItem value="Wema Bank">Wema Bank</SelectItem>
                        <SelectItem value="Fidelity Bank">Fidelity Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Account Number (NUBAN)</Label>
                    <Input 
                      required 
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={editDestAccount} 
                      onChange={(e) => setEditDestAccount(e.target.value.replace(/[^0-9]/g, ""))} 
                      className="mt-1 h-8 text-xs" 
                      placeholder="e.g. 0123456789" 
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Account Name</Label>
                  <Input 
                    required 
                    value={editDestName} 
                    onChange={(e) => setEditDestName(e.target.value)} 
                    className="mt-1 h-8 text-xs" 
                    placeholder="e.g. Sanitation Contractor Ltd" 
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingCategory(null)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" variant="hero" className="cursor-pointer">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </OrgShell>
  );
}
