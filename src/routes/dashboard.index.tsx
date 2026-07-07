import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OrgShell } from "./dashboard";
import { StatCard } from "@/components/duesly/stat-card";
import { StatusBadge } from "@/components/duesly/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, TrendingUp, AlertCircle, Users, Download, Plus, Sparkles, BrainCircuit, Send, PieChart as PieChartIcon } from "lucide-react";
import { formatNaira, formatNumber, monthlyTrend } from "@/lib/sample-data";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { getDashboardData, generateBills, getAICoachInsights, askAICoach } from "@/lib/db-actions";
import { useState, useEffect } from "react";

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
  const isTrendEmpty = (trendData || []).every(t => t.collected === 0);
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
      if (parsed.org_id && parsed.org_id !== "ORG-001") {
        setActiveOrgId(parsed.org_id);
        
        getDashboardData({ data: { orgId: parsed.org_id } })
          .then((res) => {
            setActiveOrgName(res.orgName);
            setStatsData(res.stats);
            setRecentPaymentsData(res.recentPayments);
            setCategoryBreakdownData(res.categoryBreakdown);
            setTrendData(res.trend || []);
          })
          .catch(console.error);
      }
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

  const handleExportPayments = () => {
    if (recentPaymentsData.length === 0) {
      toast.error("No recent payments available to export.");
      return;
    }
    const headers = ["Payment ID", "Vendor", "Amount (₦)", "Method", "Date", "Status"];
    const csvRows = [headers.join(",")];
    recentPaymentsData.forEach(p => {
      csvRows.push([
        p.id,
        `"${p.vendor}"`,
        p.amount,
        (p as any).method || p.account || "Bank Transfer",
        `"${p.date}"`,
        p.status
      ].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `duesly_recent_payments_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Recent payments registry downloaded!");
  };

  return (
    <OrgShell
      title={activeOrgName}
      subtitle="Real-time collection overview"
      actions={
        <>
          <Button variant="outline" onClick={handleExportPayments} disabled={recentPaymentsData.length === 0}><Download className="h-4 w-4" /> Export</Button>
          <Button variant="hero" onClick={handleGenerateBills}><Plus className="h-4 w-4" /> Generate Bills</Button>
        </>
      }
    >
      {/* Dynamic Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Vendors" value={formatNumber(statsData.totalVendors)} delta="Registered members" trend="up" accent="navy" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Expected (Jun)" value={formatNaira(statsData.expected)} delta="Total outstanding plus collected" accent="info" icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Collected" value={formatNaira(statsData.collected)} delta={`${statsData.expected > 0 ? Math.round((statsData.collected / statsData.expected) * 100) : 0}% of expected`} trend="up" accent="emerald" icon={<TrendingUp className="h-5 w-5" />} />
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
            <div 
              className="prose prose-sm max-w-none text-muted-foreground [&>h3]:text-navy [&>h3]:font-bold [&>h3]:mb-1 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:space-y-1.5"
              dangerouslySetInnerHTML={{ 
                __html: insights
                  .replace(/### (.*)/g, "<h3 class='text-sm font-bold text-navy mt-1'>$1</h3>")
                  .replace(/\* \*\*(.*?)\*\*(.*)/g, "<li class='text-xs mt-1'><strong>$1</strong>$2</li>")
                  .replace(/- \*\frac{(.*?)\*\*(.*)/g, "<li class='text-xs mt-1'><strong>$1</strong>$2</li>")
              }} 
            />
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
                  <p className="whitespace-pre-line">{reply}</p>
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
              <p className="text-sm text-muted-foreground">Collected vs expected — last 6 months (₦M)</p>
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
              {recentPaymentsData.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-5 py-3 font-medium text-foreground">{p.vendor}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.account}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNaira(p.amount)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.date}</td>
                  <td className="px-5 py-3"><StatusBadge status={p.status === "Matched" || p.status === "paid" ? "paid" : p.status === "Overpaid" || p.status === "overpaid" ? "overpaid" : "partial"} /></td>
                </tr>
              ))}
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
    </OrgShell>
  );
}
