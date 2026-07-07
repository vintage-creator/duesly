import { createFileRoute, useRouter } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNaira, formatNumber } from "@/lib/sample-data";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getSuperAdminData, createOrganization, updateOrgStatus, updateOrganization, deleteOrganization } from "@/lib/db-actions";

export const Route = createFileRoute("/super-admin/organizations")({
  loader: async () => {
    return await getSuperAdminData();
  },
  head: () => ({ meta: [{ title: "Organizations — Duesly Admin" }] }),
  component: Page,
});

function Page() {
  const { organizations } = Route.useLoaderData();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Market");
  const [expectedCapacity, setExpectedCapacity] = useState("100");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Manage Organization state
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("Market");
  const [editCapacity, setEditCapacity] = useState("100");
  const [savingEdit, setSavingEdit] = useState(false);

  const list = organizations.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));

  const handleOpenManage = (org: any) => {
    setSelectedOrg(org);
    setEditName(org.name);
    setEditType(org.type);
    setEditCapacity(org.expectedCapacity.toString());
    setManageDialogOpen(true);
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Please enter organization name");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await updateOrganization({
        data: {
          id: selectedOrg.id,
          name: editName,
          type: editType,
          expectedCapacity: parseInt(editCapacity) || 100
        }
      });
      if (res.success) {
        toast.success("Organization details updated successfully!");
        setManageDialogOpen(false);
        router.invalidate();
      } else {
        toast.error("Failed to update organization details");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating organization details");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteOrg = async (id: string) => {
    if (!confirm("Are you absolutely sure you want to decommission this organization? This will permanently delete all associated users, members, and transactions. This action CANNOT be undone.")) {
      return;
    }
    try {
      const res = await deleteOrganization({ data: { id } });
      if (res.success) {
        toast.success("Organization successfully decommissioned and deleted!");
        setManageDialogOpen(false);
        router.invalidate();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting organization");
    }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !adminFirstName.trim() || !adminLastName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      toast.error("Please fill in all details");
      return;
    }

    try {
      const res = await createOrganization({ data: { 
        name, 
        type, 
        expectedCapacity: parseInt(expectedCapacity) || 100,
        adminFirstName, 
        adminLastName, 
        adminEmail, 
        adminPassword 
      } });
      if (res.success) {
        toast.success(`Organization "${name}" onboarded with primary admin!`);
        setName("");
        setType("Market");
        setExpectedCapacity("100");
        setAdminFirstName("");
        setAdminLastName("");
        setAdminEmail("");
        setAdminPassword("");
        setDialogOpen(false);
        router.invalidate();
      } else {
        toast.error("Could not onboard organization");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error onboarding organization");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const res = await updateOrgStatus({ data: { id, status: nextStatus } });
      if (res.success) {
        toast.success(`Organization status updated to ${nextStatus}!`);
        router.invalidate();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating organization status");
    }
  };

  return (
    <SuperShell title="Organizations" subtitle="Every association onboarded on Duesly."
      actions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Onboard org
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Onboard new organization</DialogTitle></DialogHeader>
            <form onSubmit={handleOnboard} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input
                    id="orgName"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ariaria Market"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="orgType">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Market", "Estate", "Cooperative", "Trade Group", "Local Collection"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="orgCapacity">Expected Capacity (Total Shops / Members / Residents)</Label>
                <Input
                  id="orgCapacity"
                  type="number"
                  required
                  value={expectedCapacity}
                  onChange={(e) => setExpectedCapacity(e.target.value)}
                  placeholder="e.g. 500"
                  className="mt-1"
                />
              </div>

              <div className="border-t border-border/80 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-navy uppercase tracking-wider">Primary Admin Account</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="adminFirst">First Name</Label>
                    <Input id="adminFirst" required value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} placeholder="John" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="adminLast">Last Name</Label>
                    <Input id="adminLast" required value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} placeholder="Doe" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="adminEmail">Email Address</Label>
                  <Input id="adminEmail" type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="john@example.com" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="adminPass">Initial Password</Label>
                  <Input id="adminPass" type="password" required value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••••" className="mt-1" />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" variant="hero" className="w-full">Onboard & Create User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="border-b border-border p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search organizations…" className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Onboarded / Capacity</th>
                <th className="px-5 py-3 text-right">Collected</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-emerald text-xs font-semibold text-white">{o.name.split(" ").map((w: string) => w[0]).slice(0,2).join("")}</div>
                      <div><p className="font-medium">{o.name}</p><p className="text-xs text-muted-foreground">{o.id}</p></div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{o.type}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{o.vendors} / {(o as any).expectedCapacity || 100}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNaira(o.collected)}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status as any} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleOpenManage(o)}>Manage</Button>
                      <Button size="sm" variant="outline" onClick={() => handleToggleStatus(o.id, o.status)}>
                        {o.status === "active" ? "Suspend" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No matching organizations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Organization Dialog */}
      {selectedOrg && (
        <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display font-bold text-navy text-lg">
                Manage Organization — {selectedOrg.name}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleUpdateOrg} className="space-y-6 py-2">
              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-secondary/40 p-4 border border-border">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Reconciled Collections</p>
                  <p className="text-lg font-bold text-navy mt-0.5">{formatNaira(selectedOrg.collected)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Active Members</p>
                  <p className="text-lg font-bold text-navy mt-0.5">{formatNumber(selectedOrg.vendors)}</p>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Organization Name</Label>
                  <Input
                    id="edit-name"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-type">Type</Label>
                    <div className="mt-1">
                      <Select value={editType} onValueChange={setEditType}>
                        <SelectTrigger id="edit-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Market">Market Union</SelectItem>
                          <SelectItem value="Estate">Residential Estate</SelectItem>
                          <SelectItem value="Cooperative">Cooperative</SelectItem>
                          <SelectItem value="Trade Group">Trade Group</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-capacity">Expected Capacity</Label>
                    <Input
                      id="edit-capacity"
                      type="number"
                      required
                      value={editCapacity}
                      onChange={(e) => setEditCapacity(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Org Reference ID: <span className="font-semibold text-navy">{selectedOrg.id}</span>
                  </p>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t border-border pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="sm:mr-auto text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  onClick={() => handleDeleteOrg(selectedOrg.id)}
                >
                  Decommission Org
                </Button>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="ghost" onClick={() => setManageDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="hero" disabled={savingEdit} className="cursor-pointer">
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </SuperShell>
  );
}
