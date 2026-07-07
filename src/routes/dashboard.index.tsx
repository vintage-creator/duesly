import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { StatCard } from "@/components/duesly/stat-card";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardList, TrendingUp, AlertCircle, Users, Download, Plus, Sparkles, BrainCircuit, Send, PieChart as PieChartIcon, Printer } from "lucide-react";
import { formatNaira, formatNumber, monthlyTrend } from "@/lib/sample-data";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { getDashboardData, generateBills, getAICoachInsights, askAICoach, getExportTransactions } from "@/lib/db-actions";
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/")({
  loader: async () => {
    return await getDashboardData();
  },
  head: ({ loaderData }) => ({ 
    meta: [
      { title: `${loaderData?.orgName || "Dashboard"} — Duesly` }, 
      { name: "description", content: "Organization dashboard overview." }
    ] 
  }),
  component: Page,
});

function parseMarkdown(text: string) {
  if (!text) return [];
  const lines = text.split("\n");
  const parsed: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = (key: number) => {
    if (inList && listItems.length > 0) {
      parsed.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 space-y-1 my-2 text-xs text-muted-foreground">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const parseInlineStyles = (str: string) => {
    const parts = [];
    let currentIdx = 0;
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    let keyIdx = 0;
    while ((match = boldRegex.exec(str)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > currentIdx) {
        parts.push(str.substring(currentIdx, matchIndex));
      }
      parts.push(
        <strong key={`bold-${keyIdx++}`} className="font-semibold text-navy">
          {match[1]}
        </strong>
      );
      currentIdx = boldRegex.lastIndex;
    }
    if (currentIdx < str.length) {
      parts.push(str.substring(currentIdx));
    }
    return parts.length > 0 ? parts : str;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(idx);
      return;
    }

    if (trimmed.startsWith("###")) {
      flushList(idx);
      const content = trimmed.substring(3).trim();
      parsed.push(
        <h4 key={`h4-${idx}`} className="text-sm font-bold text-navy mt-4 mb-1.5 first:mt-0">
          {parseInlineStyles(content)}
        </h4>
      );
    } else if (trimmed.startsWith("##")) {
      flushList(idx);
      const content = trimmed.substring(2).trim();
      parsed.push(
        <h3 key={`h3-${idx}`} className="text-base font-bold text-navy mt-5 mb-2 first:mt-0">
          {parseInlineStyles(content)}
        </h3>
      );
    } else if (trimmed.startsWith("#")) {
      flushList(idx);
      const content = trimmed.substring(1).trim();
      parsed.push(
        <h2 key={`h2-${idx}`} className="text-lg font-bold text-navy mt-6 mb-3 first:mt-0">
          {parseInlineStyles(content)}
        </h2>
      );
    } else if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
      inList = true;
      const content = trimmed.substring(1).trim();
      listItems.push(
        <li key={`li-${idx}`} className="leading-relaxed">
          {parseInlineStyles(content)}
        </li>
      );
    } else {
      flushList(idx);
      parsed.push(
        <p key={`p-${idx}`} className="my-2 text-xs leading-relaxed text-slate-600">
          {parseInlineStyles(trimmed)}
        </p>
      );
    }
  });

  flushList(lines.length);
  return parsed;
}

const formatSignedNaira = (amount: number) => {
  const numericAmount = Number(amount) || 0;
  const sign = numericAmount < 0 ? "-" : "";
  return `${sign}${formatNaira(Math.abs(numericAmount))}`;
};

function Page() {
  const { orgName, stats, recentPayments, categoryBreakdown, trend } = Route.useLoaderData();
  const router = useRouter();

  // Multi-tenant scoped states
  const [activeOrgId, setActiveOrgId] = useState("ORG-001");
  const [activeOrgName, setActiveOrgName] = useState(orgName);
  const [statsData, setStatsData] = useState(stats);
  const [recentPaymentsData, setRecentPaymentsData] = useState(recentPayments);
  const [categoryBreakdownData, setCategoryBreakdownData] = useState(categoryBreakdown);
  const [trendData, setTrendData] = useState(trend || []);
  const [loading, setLoading] = useState(true);
  const isTrendEmpty = statsData.collected === 0 && (trendData || []).every(t => t.collected === 0);
  const isCategoryEmpty = (categoryBreakdownData || []).every(c => c.value === 0);

  // AI Insights states
  const [insights, setInsights] = useState("");
  const [loadingAI, setLoadingAI] = useState(true);

  // AI Chat states
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState("");
  const [asking, setAsking] = useState(false);

  // Mount logic to resolve dynamic organization session
  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      const userOrgId = parsed.org_id;
      if (userOrgId) {
        setActiveOrgId(userOrgId);
        getDashboardData({ data: { orgId: userOrgId } })
          .then((res) => {
            setActiveOrgName(res.orgName);
            setStatsData(res.stats);
            setRecentPaymentsData(res.recentPayments);
            setCategoryBreakdownData(res.categoryBreakdown);
            setTrendData(res.trend || []);
            setLoading(false);
          })
          .catch((err) => {
            console.error(err);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [orgName]);

  // Load AI coach insights scoped to organization
  useEffect(() => {
    setLoadingAI(true);
    getAICoachInsights({ data: { orgId: activeOrgId } })
      .then((res) => {
        setInsights(res.insights);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoadingAI(false);
      });
  }, [activeOrgId]);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setReply("");
    try {
      const res = await askAICoach({ data: { question, orgId: activeOrgId } });
      setReply(res.reply);
      toast.success("AI Coach compiled collection strategy!");
    } catch (err) {
      console.error(err);
      toast.error("AI Coach is currently busy. Please try again.");
    } finally {
      setAsking(false);
    }
  };

  const handleGenerateBills = async () => {
    toast.promise(generateBills({ data: { orgId: activeOrgId } }), {
      loading: "Generating bills for all active vendors...",
      success: (res) => {
        router.invalidate();
        return `Bills generated successfully: ${formatNaira(res.amountApplied)} applied to all vendors!`;
      },
      error: "Failed to generate bills",
    });
  };

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState("all");
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [exportingPDF, setExportingPDF] = useState(false);

  const filteredTransactions = selectedSection === "all"
    ? allTransactions
    : allTransactions.filter(t => t.section === selectedSection);

  const handleExportOpen = async () => {
    setExportDialogOpen(true);
    try {
      const res = await getExportTransactions({ data: { orgId: activeOrgId } });
      setAllTransactions(res || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load full transaction history.");
    }
  };

  const handleExportPDFSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setExportingPDF(true);

    if (filteredTransactions.length === 0) {
      toast.error("No transactions match the selected section.");
      setExportingPDF(false);
      return;
    }

    setTimeout(() => {
      window.print();
      setExportingPDF(false);
      setExportDialogOpen(false);
    }, 100);
  };

  if (loading) {
    return (
      <OrgShell title={activeOrgName} subtitle="Real-time collection overview">
        <div className="min-h-[450px] flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald border-t-transparent" />
          <p className="text-xs text-muted-foreground font-medium animate-pulse">Initializing workspace...</p>
        </div>
      </OrgShell>
    );
  }

  return (
    <OrgShell
      title={activeOrgName}
      subtitle="Real-time collection overview"
      actions={
        <>
          <Button variant="outline" className="cursor-pointer" onClick={handleExportOpen} disabled={recentPaymentsData.length === 0}><Download className="h-4 w-4" /> Export</Button>
          <Button variant="hero" onClick={handleGenerateBills}><Plus className="h-4 w-4" /> Generate Bills</Button>
        </>
      }
    >
      {/* Dynamic Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Vendors" value={formatNumber(statsData.totalVendors)} delta="Registered members" trend="up" accent="navy" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Expected (Jun)" value={formatNaira(statsData.expected)} delta="Total outstanding plus collected" accent="info" icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard 
          label="Collected" 
          value={formatNaira(statsData.collected)} 
          delta={
            statsData.totalRefunded > 0 
              ? `${statsData.expected > 0 ? Math.round((statsData.collected / statsData.expected) * 100) : 0}% of expected (${formatNaira(statsData.totalRefunded || 0)} refunded)`
              : `${statsData.expected > 0 ? Math.round((statsData.collected / statsData.expected) * 100) : 0}% of expected`
          } 
          trend="up" 
          accent="emerald" 
          icon={<TrendingUp className="h-5 w-5" />} 
        />
        <StatCard label="Outstanding" value={formatNaira(statsData.outstanding)} delta="Vendor remaining balances" trend="down" accent="gold" icon={<AlertCircle className="h-5 w-5" />} />
      </div>

      {/* Duesly AI Collection Coach Insights */}
      <div className="mt-6 rounded-3xl border border-emerald/20 bg-gradient-to-r from-emerald/5 via-gold/5 to-navy/5 p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-emerald text-white shadow-emerald animate-pulse">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-navy flex items-center gap-2">
              Duesly AI Collection Coach <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--gold-foreground)]"><Sparkles className="h-3 w-3" /> Live Insights</span>
            </h3>
            <p className="text-xs text-muted-foreground">Automated audit of active market ledgers & compliance metrics.</p>
          </div>
        </div>
        
        <div className="text-sm leading-relaxed text-foreground">
          {loadingAI ? (
            <div className="space-y-2 py-2">
              <div className="h-4 w-3/4 rounded-md bg-secondary animate-shimmer" />
              <div className="h-4 w-5/6 rounded-md bg-secondary animate-shimmer" />
              <div className="h-4 w-2/3 rounded-md bg-secondary animate-shimmer" />
            </div>
          ) : (
            <div className="space-y-1">
              {parseMarkdown(insights)}
            </div>
          )}
        </div>

        {/* AI Chat Interactive Section */}
        <div className="border-t border-border/80 pt-4 space-y-3">
          <p className="text-xs font-semibold text-navy">Ask AI Coach a question:</p>
          <form onSubmit={handleAskAI} className="flex gap-2">
            <Input 
              value={question} 
              onChange={(e) => setQuestion(e.target.value)} 
              placeholder="e.g. How do I recover outstanding sanitation fees in provisions line?" 
              className="flex-1 text-xs"
              required
            />
            <Button type="submit" variant="hero" size="sm" disabled={asking}>
              {asking ? "Thinking..." : <><Send className="h-3.5 w-3.5 mr-1.5" /> Ask</>}
            </Button>
          </form>

          {/* AI Reply Block */}
          {(asking || reply) && (
            <div className="rounded-xl border border-border/60 bg-white/70 p-4 text-xs leading-relaxed text-muted-foreground shadow-soft">
              {asking ? (
                <div className="space-y-2">
                  <div className="h-3.5 w-full rounded bg-secondary animate-shimmer" />
                  <div className="h-3.5 w-5/6 rounded bg-secondary animate-shimmer" />
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-navy mb-1.5">AI Response:</p>
                  <div className="space-y-1">
                    {parseMarkdown(reply)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-navy">Collection trend</h3>
              <p className="text-sm text-muted-foreground">Collected vs expected — last 6 months {statsData.suffix ? `(₦${statsData.suffix})` : "(₦)"}</p>
            </div>
          </div>
          <div className="mt-4 h-72">
            {statsData.totalVendors === 0 || trendData.length === 0 || isTrendEmpty ? (
              <div className="h-full flex flex-col items-center justify-center border border-dashed rounded-2xl bg-secondary/5 text-center p-6">
                <TrendingUp className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-navy">No transaction data</p>
                <p className="text-xs text-muted-foreground max-w-[240px] mt-1 font-sans">Assign account numbers and collect your first payments to build trends.</p>
              </div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={trendData} margin={{ left: -10, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--navy)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--navy)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [`₦${value}M`, ""]} />
                  <Area type="monotone" dataKey="collected" stroke="var(--emerald)" strokeWidth={2} fillOpacity={1} fill="url(#cg)" name="Collected" />
                  <Area type="monotone" dataKey="expected" stroke="var(--navy)" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#eg)" name="Expected" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-soft flex flex-col justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-navy">Category breakdown</h3>
            <p className="text-sm text-muted-foreground">Distribution across active levies</p>
          </div>
          {statsData.totalVendors === 0 || categoryBreakdownData.length === 0 || isCategoryEmpty ? (
            <div className="mt-4 h-60 flex flex-col items-center justify-center border border-dashed rounded-2xl bg-secondary/5 text-center p-6">
              <PieChartIcon className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold text-navy">No categories config</p>
              <p className="text-xs text-muted-foreground max-w-[200px] mt-1 font-sans">Set up payment categories to visualize distribution.</p>
            </div>
          ) : (
            <>
              <div className="mt-4 h-48 flex justify-center items-center">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={categoryBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4}>
                      {categoryBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNaira(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-4 space-y-2 text-xs">
                {categoryBreakdownData.map((c) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      <span className="text-foreground">{c.name}</span>
                    </span>
                    <span className="font-medium text-muted-foreground">{formatNaira(c.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-4">
        {[
          { l: "Paid vendors", v: formatNumber(statsData.paid), s: "paid" as const },
          { l: "Partially paid", v: formatNumber(statsData.partial), s: "partial" as const },
          { l: "Unpaid vendors", v: formatNumber(statsData.unpaid), s: "unpaid" as const },
          { l: "Overpaid vendors", v: formatNumber(statsData.overpaid), s: "overpaid" as const },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{k.l}</p>
              <StatusBadge status={k.s} />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-foreground">{k.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-bold text-navy">Recent payments</h3>
            <p className="text-sm text-muted-foreground">Latest reconciled inflows</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href="/dashboard/payments">View all</a>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Virtual a/c</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPaymentsData.map((p) => {
                const isDebit = Number(p.amount) < 0;

                return (
                  <tr
                    key={p.id}
                    className={`border-t border-border hover:bg-secondary/40 ${isDebit ? "bg-rose-50/50" : "bg-emerald-50/40"}`}
                  >
                  <td className="px-5 py-3 font-medium text-foreground">{p.vendor}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.account}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{p.category}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${isDebit ? "bg-rose-100 text-rose-700" : "bg-emerald/10 text-emerald-700"}`}>
                        {isDebit ? "Debit" : "Credit"}
                      </span>
                    </div>
                  </td>
                  <td className={`px-5 py-3 text-right font-semibold ${isDebit ? "text-rose-700" : "text-emerald-700"}`}>
                    {isDebit ? formatSignedNaira(p.amount) : `+${formatNaira(Number(p.amount) || 0)}`}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{p.date}</td>
                  <td className="px-5 py-3"><StatusBadge status={p.status === "Matched" || p.status === "paid" ? "paid" : p.status === "Overpaid" || p.status === "overpaid" ? "overpaid" : "partial"} /></td>
                </tr>
                );
              })}
              {recentPaymentsData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No recent payments recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Transactions Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={(o) => !o && setExportDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-navy text-lg">Export Transaction History</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExportPDFSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="export-section">Filter by Section</Label>
              <div className="mt-1.5">
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger id="export-section" className="w-full bg-transparent border-border focus:ring-emerald cursor-pointer">
                    <SelectValue placeholder="Select section..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">All Sections</SelectItem>
                    <SelectItem value="Textile Line" className="cursor-pointer">Textile Line</SelectItem>
                    <SelectItem value="Provisions" className="cursor-pointer">Provisions</SelectItem>
                    <SelectItem value="Electronics" className="cursor-pointer">Electronics</SelectItem>
                    <SelectItem value="Cosmetics" className="cursor-pointer">Cosmetics</SelectItem>
                    <SelectItem value="Grains" className="cursor-pointer">Grains</SelectItem>
                    <SelectItem value="Hardware" className="cursor-pointer">Hardware</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Select a specific branch or zone section registry to scope payments, or export all.</p>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setExportDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="hero" disabled={exportingPDF} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" /> {exportingPDF ? "Compiling PDF..." : "Export PDF"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hidden Printable PDF Section */}
      <div id="printable-ledger" className="hidden">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-ledger, #printable-ledger * {
              visibility: visible;
            }
            #printable-ledger {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
              font-family: sans-serif;
              padding: 24px;
            }
          }
        `}</style>
        <div className="flex justify-between items-center border-b pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">duesly</span>
              <span className="text-[10px] border border-slate-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider">OFFICIAL LEDGER</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mt-2">{activeOrgName}</h1>
            <p className="text-xs text-slate-500">Transaction History Report</p>
          </div>
          <div className="text-right text-xs text-slate-500 leading-relaxed">
            <p><strong>Report Scoped:</strong> {selectedSection === "all" ? "All Sections" : `Section: ${selectedSection}`}</p>
            <p><strong>Printed Date:</strong> {new Date().toLocaleDateString("en-NG")}</p>
            <p><strong>Platform Status:</strong> Cleared</p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-700 font-bold uppercase">
              <th className="py-2.5">Ref ID</th>
              <th className="py-2.5">Member Name</th>
              <th className="py-2.5">Section</th>
              <th className="py-2.5">Category</th>
              <th className="py-2.5 text-right">Amount</th>
              <th className="py-2.5">Date</th>
              <th className="py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((t) => (
              <tr key={t.id} className="border-b border-slate-200 text-slate-800">
                <td className="py-2.5 font-mono text-[10px]">{t.id}</td>
                <td className="py-2.5 font-semibold">{t.vendor}</td>
                <td className="py-2.5">{t.section}</td>
                <td className="py-2.5">{t.category}</td>
                <td className="py-2.5 text-right font-mono font-semibold">{formatSignedNaira(t.amount)}</td>
                <td className="py-2.5 text-slate-500">{t.date}</td>
                <td className="py-2.5 font-bold uppercase text-[9px]">{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 border-t pt-4 flex justify-between items-center text-[10px] text-slate-500">
          <p>Duesly Technologies Ltd · Collection Reconciliation Feed</p>
          <p>Page 1 of 1</p>
        </div>
      </div>
    </OrgShell>
  );
}
