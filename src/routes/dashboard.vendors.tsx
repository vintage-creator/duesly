import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Copy, Phone, MapPin, Upload, LayoutGrid, List } from "lucide-react";
import { formatNaira } from "@/lib/sample-data";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { getVendors, createVendor, getVendorHistory, importVendorsCSV } from "@/lib/db-actions";
import * as XLSX from "xlsx";

type Vendor = {
  id: string;
  name: string;
  shop: string;
  phone: string;
  section: string;
  virtualAccount: string;
  due: number;
  paid: number;
  status: "paid" | "partial" | "unpaid" | "overpaid";
};

export const Route = createFileRoute("/dashboard/vendors")({
  loader: async () => {
    return await getVendors();
  },
  head: () => ({ meta: [{ title: "Vendors & Shops — Duesly" }] }),
  component: Page,
});

function Page() {
  const vendors = Route.useLoaderData();
  const router = useRouter();

  const [activeOrgId, setActiveOrgId] = useState("ORG-001");
  const [vendorsList, setVendorsList] = useState<Vendor[]>(vendors);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "pictorial">("table");
  const [orgType, setOrgType] = useState("Market");
  const [active, setActive] = useState<Vendor | null>(null);
  const [history, setHistory] = useState<{ d: string; a: number; c: string }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [shop, setShop] = useState("");
  const [section, setSection] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Load organization-scoped vendors & settings
  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed.org_type) {
        setOrgType(parsed.org_type);
      }
      if (parsed.org_id && parsed.org_id !== "ORG-001") {
        setActiveOrgId(parsed.org_id);
        getVendors({ data: { orgId: parsed.org_id } })
          .then((res) => {
            setVendorsList(res);
          })
          .catch(console.error);
      }
    }
  }, [vendors]);

  const singularLabel = orgType === "Estate" ? "Resident" : orgType === "Cooperative" ? "Member" : "Vendor";
  const pluralLabel = orgType === "Estate" ? "Residents" : orgType === "Cooperative" ? "Members" : "Vendors";
  const coordinateLabel = orgType === "Estate" ? "House/Block" : orgType === "Cooperative" ? "Member ID" : "Shop/Stall";
  const sectionLabel = orgType === "Estate" ? "Street/Zone" : orgType === "Cooperative" ? "Division" : "Section";

  // Filter vendors
  const filtered = useMemo(() => vendorsList.filter((v) =>
    (status === "all" || v.status === status) &&
    (q === "" || [v.name, v.shop, v.section, v.virtualAccount].some((x) => x.toLowerCase().includes(q.toLowerCase()))),
  ), [vendorsList, q, status]);

  // Load history when active vendor changes
  useEffect(() => {
    if (active) {
      setLoadingHistory(true);
      getVendorHistory({ data: { id: active.id } })
        .then((res) => {
          setHistory(res);
        })
        .catch((err) => {
          console.error("Failed to load history:", err);
          toast.error("Could not fetch payment history");
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    } else {
      setHistory([]);
    }
  }, [active]);

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createVendor({ data: { name, phone, shop, section, orgId: activeOrgId } });
      if (res.success) {
        toast.success(`Vendor ${name} created! Virtual Account: ${res.virtualAccount}`);
        setName("");
        setPhone("");
        setShop("");
        setSection("");
        setDialogOpen(false);
        
        getVendors({ data: { orgId: activeOrgId } })
          .then(setVendorsList)
          .catch(console.error);
          
        router.invalidate();
      } else {
        toast.error("Could not create vendor");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating vendor");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    const triggerImport = (csvContent: string) => {
      toast.promise(importVendorsCSV({ data: { csvContent, orgId: activeOrgId } }), {
        loading: "Processing bulk upload and provisioning Nomba virtual accounts...",
        success: (res) => {
          getVendors({ data: { orgId: activeOrgId } })
            .then(setVendorsList)
            .catch(console.error);
          router.invalidate();
          return `Successfully imported ${res.imported} vendors and registered Nomba virtual accounts!`;
        },
        error: "Failed to import registry data.",
      });
    };

    if (extension === "csv") {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csvContent = event.target?.result as string;
        if (!csvContent) return;
        triggerImport(csvContent);
      };
      reader.readAsText(file);
    } else if (extension === "xlsx" || extension === "xls") {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const sheetJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          // Convert sheet rows array to CSV lines format
          const csvLines = sheetJson
            .filter(row => row && row.length > 0 && row[0] !== undefined)
            .map(row => row.map(cell => (cell !== undefined && cell !== null ? String(cell).replace(/,/g, " ") : "")).join(","))
            .join("\n");
          
          triggerImport(csvLines);
        } catch (err) {
          console.error(err);
          toast.error("Failed to parse Excel file.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Unsupported file format. Please upload CSV or Excel files.");
    }
  };

  return (
    <OrgShell
      title={pluralLabel}
      subtitle={`Manage every ${singularLabel.toLowerCase()}, their virtual account and balances.`}
      actions={
        <>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-secondary border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary/80 gap-1.5 transition-colors shadow-soft h-10">
            <Upload className="h-4 w-4" /> Bulk Import
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Add {singularLabel}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add new {singularLabel.toLowerCase()}</DialogTitle></DialogHeader>
              <form onSubmit={handleAddVendor} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Full name</Label>
                    <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chinedu Okafor" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 …" />
                  </div>
                  <div>
                    <Label>{coordinateLabel}</Label>
                    <Input required value={shop} onChange={(e) => setShop(e.target.value)} placeholder="B-12" />
                  </div>
                  <div>
                    <Label>{sectionLabel}</Label>
                    <Input required value={section} onChange={(e) => setSection(e.target.value)} placeholder="Textile Line" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="hero" type="submit">Create {singularLabel.toLowerCase()}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search by name, ${coordinateLabel.toLowerCase()}, ${sectionLabel.toLowerCase()}…`} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overpaid">Overpaid</SelectItem>
              </SelectContent>
            </Select>

            {/* View Switcher Toggle */}
            <div className="flex border border-border rounded-xl p-0.5 bg-secondary/50">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-card text-navy shadow-soft"
                    : "text-muted-foreground hover:text-navy"
                }`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("pictorial")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "pictorial"
                    ? "bg-card text-navy shadow-soft"
                    : "text-muted-foreground hover:text-navy"
                }`}
                title="Pictorial Board"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{singularLabel}</th>
                  <th className="px-4 py-3">{coordinateLabel}</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">{sectionLabel}</th>
                  <th className="px-4 py-3">Virtual a/c</th>
                  <th className="px-4 py-3 text-right">Due</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="cursor-pointer border-t border-border hover:bg-secondary/40" onClick={() => setActive(v)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-emerald text-xs font-semibold text-white">
                          {v.name.split(" ").map((p: string) => p[0]).slice(0,2).join("")}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{v.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{v.shop}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.section}</td>
                    <td className="px-4 py-3 font-mono text-xs">{v.virtualAccount}</td>
                    <td className="px-4 py-3 text-right">{formatNaira(v.due)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatNaira(v.paid)}</td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">No {pluralLabel.toLowerCase()} match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Pictorial Grid View */
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-fade-in-up">
            {filtered.map((v) => {
              const initials = v.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
              const outstanding = Math.max(0, v.due - v.paid);
              return (
                <div
                  key={v.id}
                  onClick={() => setActive(v)}
                  className="group relative cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:border-emerald hover:shadow-soft flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`grid h-12 w-12 place-items-center rounded-full text-sm font-bold text-white bg-gradient-navy ring-2 ring-offset-2 ${
                          v.status === "paid" ? "ring-emerald" : v.status === "partial" ? "ring-gold" : v.status === "overpaid" ? "ring-purple-500" : "ring-destructive"
                        }`}>
                          {initials}
                        </div>
                        <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background ${
                          v.status === "paid" ? "bg-emerald" : v.status === "partial" ? "bg-gold" : v.status === "overpaid" ? "bg-purple-500" : "bg-destructive"
                        }`} />
                      </div>
                      <div className="max-w-[120px] truncate">
                        <p className="font-semibold text-navy text-xs truncate group-hover:text-emerald transition-colors">{v.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{v.id}</p>
                      </div>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>

                  <div className="mt-4 space-y-2 border-t pt-3 text-[11px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>{coordinateLabel}:</span>
                      <span className="font-semibold text-navy">{v.shop}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{sectionLabel}:</span>
                      <span className="font-semibold text-navy">{v.section}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outstanding:</span>
                      <span className={`font-semibold ${outstanding > 0 ? "text-destructive" : "text-emerald"}`}>{formatNaira(outstanding)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-[10px] h-8 bg-secondary hover:bg-secondary/80 font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard?.writeText(v.virtualAccount);
                        toast.success("Account number copied!");
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Account
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[10px] h-8 font-bold border border-border"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActive(v);
                      }}
                    >
                      Ledger
                    </Button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground text-sm">
                No {pluralLabel.toLowerCase()} match your filters.
              </div>
            )}
          </div>
        )}
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle>{active.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-gradient-hero p-5 text-white">
                  <p className="text-xs uppercase tracking-wider text-white/70">Dedicated payment account</p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="font-display text-2xl font-bold tracking-wider">{active.virtualAccount}</p>
                    <button onClick={() => { navigator.clipboard?.writeText(active.virtualAccount); toast.success("Account number copied to clipboard"); }}
                      className="rounded-lg bg-white/15 p-2 hover:bg-white/25"><Copy className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-1 text-xs text-white/70">Nomba Account Number · Powered by Nomba</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Shop" value={active.shop} />
                  <Stat label="Section" value={active.section} />
                  <Stat label="Current bill" value={formatNaira(active.due)} />
                  <Stat label="Amount paid" value={formatNaira(active.paid)} />
                </div>

                <div className="rounded-xl border border-border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
                  <div className="mt-1 flex items-center justify-between">
                    <StatusBadge status={active.status} />
                    <span className="text-muted-foreground inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {active.phone}</span>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-navy">Payment history</p>
                  {loadingHistory ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Loading payments...</p>
                  ) : history.length > 0 ? (
                    <div className="space-y-2">
                      {history.map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                          <div>
                            <p className="font-medium">{r.c}</p>
                            <p className="text-xs text-muted-foreground">{r.d}</p>
                          </div>
                          <span className="font-semibold text-emerald">{formatNaira(r.a)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-4 text-center">No payment history recorded.</p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="navy" className="flex-1" onClick={() => toast.success("Receipts shared with vendor via SMS & WhatsApp")}><MapPin className="h-4 w-4" />Share receipts</Button>
                  <Button variant="outline" onClick={() => toast.success("Payment reminder sent to vendor's phone number")}>Remind</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </OrgShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}
