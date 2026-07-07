import { createFileRoute } from "@tanstack/react-router";
import { SuperShell } from "./super-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getNombaVirtualAccountsAudit } from "@/lib/db-actions";

export const Route = createFileRoute("/super-admin/accounts")({
  head: () => ({ meta: [{ title: "Nomba Accounts — Duesly Admin" }] }),
  component: Page,
});

function Page() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sourceEndpoint, setSourceEndpoint] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalRemote: 0, matched: 0, unmatched: 0 });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter((account) =>
      [
        account.accountNumber,
        account.accountName,
        account.reference,
        account.status,
        account.localMatch?.vendorName,
        account.localMatch?.orgName,
        account.localMatch?.shop,
        account.localMatch?.phone,
      ].some((value) => String(value || "").toLowerCase().includes(needle))
    );
  }, [accounts, query]);

  const handleRetrieve = async () => {
    const localUser = localStorage.getItem("user");
    const parsed = localUser ? JSON.parse(localUser) : null;
    if (!parsed?.email || !parsed?.sessionToken) {
      toast.error("Your super-admin session has expired. Please sign in again.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Retrieving Nomba virtual accounts...");
    try {
      const res = await getNombaVirtualAccountsAudit({
        data: {
          adminEmail: parsed.email,
          sessionToken: parsed.sessionToken,
        }
      });

      if (res.success) {
        setAccounts(res.accounts || []);
        setSourceEndpoint(res.sourceEndpoint || "");
        setSummary({
          totalRemote: res.totalRemote || 0,
          matched: res.matched || 0,
          unmatched: res.unmatched || 0,
        });
        toast.success(`Retrieved ${res.totalRemote || 0} Nomba account record(s).`, { id: toastId });
      } else {
        toast.error(res.error || "Could not retrieve Nomba account records.", { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Nomba account retrieval failed.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (value: string, label: string) => {
    await navigator.clipboard?.writeText(value);
    toast.success(`${label} copied.`);
  };

  return (
    <SuperShell
      title="Nomba Accounts"
      subtitle="Retrieve live virtual accounts from Nomba and compare them with Duesly records."
      actions={
        <Button variant="hero" onClick={handleRetrieve} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Retrieve from Nomba
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Remote Nomba accounts" value={summary.totalRemote.toString()} />
        <Metric label="Matched locally" value={summary.matched.toString()} tone="emerald" />
        <Metric label="Needs restoration" value={summary.unmatched.toString()} tone="amber" />
      </div>

      <div className="mt-5 rounded-2xl border bg-card shadow-soft">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search account, vendor, org, phone..." className="pl-9" />
          </div>
          {sourceEndpoint && (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
              <ShieldCheck className="h-4 w-4" /> Source: {sourceEndpoint}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Nomba account</th>
                <th className="px-5 py-3">Account name</th>
                <th className="px-5 py-3">Local record</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((account) => {
                const local = account.localMatch;
                return (
                  <tr key={`${account.accountNumber}-${account.reference}`} className={`border-t border-border ${local ? "hover:bg-emerald/5" : "bg-amber-50/50 hover:bg-amber-50"}`}>
                    <td className="px-5 py-3 font-mono text-xs">{account.accountNumber}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-navy">{account.accountName || "Nomba virtual account"}</p>
                      <p className="text-xs text-muted-foreground">{account.bankName || "Nomba MFB"}</p>
                    </td>
                    <td className="px-5 py-3">
                      {local ? (
                        <div>
                          <p className="font-medium">{local.vendorName}</p>
                          <p className="text-xs text-muted-foreground">{local.orgName || local.orgId} · {local.shop || "No coordinate"}</p>
                        </div>
                      ) : (
                        <div>
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Not in local DB</Badge>
                          <p className="mt-1 text-xs text-muted-foreground">Use this record to restore the member into the right organization.</p>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{account.reference || "N/A"}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="capitalize">{account.status || "active"}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleCopy(account.accountNumber, "Account number")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    {accounts.length === 0 ? "Retrieve Nomba account records to begin recovery checks." : "No account records match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SuperShell>
  );
}

function Metric({ label, value, tone = "navy" }: { label: string; value: string; tone?: "navy" | "emerald" | "amber" }) {
  const toneClasses = {
    navy: "text-navy bg-navy/10",
    emerald: "text-emerald bg-emerald/10",
    amber: "text-amber-700 bg-amber-100",
  };

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2 inline-flex rounded-xl px-3 py-1 font-display text-2xl font-bold ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
}
