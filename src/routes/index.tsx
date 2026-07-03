import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DueslyLogo } from "@/components/duesly/logo";
import {
  Wallet, Receipt, RefreshCcw, AlertCircle, FileBarChart2, ShieldCheck,
  Store, Building, Handshake, Users, ArrowRight, Check, Sparkles, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { formatNaira } from "@/lib/sample-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Duesly — Trusted Dues, Levies & Reconciliation" },
      { name: "description", content: "Virtual-account-powered collections for markets, estates, cooperatives & trade groups. Auto reconciliation, receipts, and reports — built for serious associations." },
      { property: "og:title", content: "Duesly — Trusted Collections for Associations" },
      { property: "og:description", content: "Issue unique virtual accounts to every vendor or member. Reconcile every naira automatically." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <DueslyLogo />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</a>
            <a href="#use-cases" className="text-sm font-medium text-muted-foreground hover:text-foreground">Who it's for</a>
            <a href="#preview" className="text-sm font-medium text-muted-foreground hover:text-foreground">Product</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">Pricing</a>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button>
            <Button variant="hero" asChild><Link to="/signup">Get started</Link></Button>
          </div>
          <button className="rounded-lg p-2 hover:bg-secondary md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-background md:hidden">
            <div className="space-y-1 px-4 py-4">
              <a href="#features" className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#use-cases" className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary" onClick={() => setMenuOpen(false)}>Who it's for</a>
              <a href="#preview" className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary" onClick={() => setMenuOpen(false)}>Product</a>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="outline" asChild><Link to="/login">Sign in</Link></Button>
                <Button variant="hero" asChild><Link to="/signup">Get started</Link></Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <svg className="absolute inset-x-0 bottom-0 text-background" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
          <path fill="currentColor" d="M0,64 C240,120 480,0 720,32 C960,64 1200,120 1440,80 L1440,120 L0,120 Z" />
        </svg>
        <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-emerald/20 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-10 left-10 h-56 w-56 rounded-full bg-gold/20 blur-3xl animate-float-slow" />

        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-32 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-gold" /> Trusted by 40+ associations
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Collect every naira.<br />
                <span className="bg-gradient-to-r from-gold via-white to-emerald bg-clip-text text-transparent">Reconcile it automatically.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">
                Duesly issues a unique virtual account to every vendor or member, so dues, levies and rent flow into your books — matched, receipted and reported in real time.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/signup">Start collecting <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button variant="outline" size="lg" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" asChild>
                  <Link to="/dashboard">View live demo</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/70">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald" /> Bank-grade security</span>
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald" /> No setup fee</span>
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald" /> Cancel anytime</span>
              </div>
            </div>

            {/* Floating preview card */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-emerald/30 via-transparent to-gold/30 blur-2xl" />
              <div className="relative rounded-3xl border border-white/20 bg-white/95 p-5 shadow-elevated backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Ariaria Market Association</p>
                    <p className="font-display text-lg font-bold text-navy">June Collection</p>
                  </div>
                  <span className="rounded-full bg-emerald/10 px-2.5 py-1 text-xs font-medium text-emerald">+12.4%</span>
                </div>
                <div className="mt-4 rounded-2xl bg-gradient-hero p-5 text-white shadow-soft">
                  <p className="text-xs uppercase tracking-wider text-white/70">Collected so far</p>
                  <p className="mt-1 font-display text-3xl font-bold">{formatNaira(17_810_500)}</p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/15">
                    <div className="h-full w-[79%] rounded-full bg-gradient-to-r from-emerald to-gold" />
                  </div>
                  <p className="mt-2 text-xs text-white/75">79% of {formatNaira(22_464_000)} expected</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-emerald/10 p-3">
                    <p className="font-display text-lg font-bold text-emerald">812</p>
                    <p className="text-[11px] text-muted-foreground">Paid</p>
                  </div>
                  <div className="rounded-xl bg-warning/15 p-3">
                    <p className="font-display text-lg font-bold text-[color:var(--warning-foreground)]">264</p>
                    <p className="text-[11px] text-muted-foreground">Partial</p>
                  </div>
                  <div className="rounded-xl bg-destructive/10 p-3">
                    <p className="font-display text-lg font-bold text-destructive">152</p>
                    <p className="text-[11px] text-muted-foreground">Unpaid</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { v: "Chinedu Okafor", a: "9032 4410 88", amt: "₦18,000", ok: true },
                    { v: "Funmi Adeyemi", a: "9032 4410 91", amt: "₦22,000", ok: true },
                    { v: "Aisha Bello", a: "9032 4410 89", amt: "₦10,000", ok: false },
                  ].map((p) => (
                    <div key={p.a} className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-navy">{p.v}</p>
                        <p className="text-[11px] text-muted-foreground">{p.a}</p>
                      </div>
                      <span className={`text-sm font-semibold ${p.ok ? "text-emerald" : "text-[color:var(--warning-foreground)]"}`}>{p.amt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos / trust */}
      <section className="border-y border-border/60 bg-secondary/40 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Trusted by associations across Nigeria</p>
          <div className="mt-5 grid grid-cols-2 gap-4 text-center sm:grid-cols-4 lg:grid-cols-5">
            {["Ariaria Market", "Onitsha Union", "Lekki Estate", "Magodo Forum", "Trans-Amadi Coop"].map((n) => (
              <div key={n} className="font-display text-sm font-semibold text-muted-foreground/80">{n}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">Features</span>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">Everything you need to collect, match and report.</h2>
            <p className="mt-4 text-muted-foreground">Built specifically for the realities of market unions, estates and cooperatives — not generic invoicing.</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { i: Wallet, t: "Unique Virtual Accounts", d: "Every vendor or member gets a dedicated NUBAN they can fund from any bank, anywhere." , c: "emerald" },
              { i: RefreshCcw, t: "Auto Reconciliation", d: "Incoming payments match instantly to the right vendor, dues category and period." , c: "navy" },
              { i: AlertCircle, t: "Over & Underpayments", d: "Smart handling for partial payments, overpayments and credits without spreadsheets." , c: "gold" },
              { i: Receipt, t: "Instant Receipts", d: "Branded receipts issued and shared automatically — by SMS, WhatsApp or download." , c: "emerald" },
              { i: FileBarChart2, t: "Reports & Exports", d: "Compliance, collection and category reports. Export to CSV or PDF in one click." , c: "navy" },
              { i: ShieldCheck, t: "Audit-Ready Ledger", d: "Every kobo accounted for, with a full trail your auditors and members can trust." , c: "gold" },
            ].map((f) => (
              <div key={f.t} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-elevated">
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${f.c === "emerald" ? "bg-gradient-emerald text-white shadow-emerald" : f.c === "gold" ? "bg-gradient-gold text-[color:var(--gold-foreground)]" : "bg-navy text-white"}`}>
                  <f.i className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-navy">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="relative overflow-hidden bg-navy py-20 text-white sm:py-28">
        <div className="absolute inset-0 opacity-30">
          <svg viewBox="0 0 800 400" className="h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="var(--emerald)" stopOpacity="0.4" />
                <stop offset="1" stopColor="var(--gold)" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path d="M0,200 Q200,80 400,200 T800,200" stroke="url(#g1)" strokeWidth="2" fill="none" />
            <path d="M0,260 Q200,140 400,260 T800,260" stroke="url(#g1)" strokeWidth="2" fill="none" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">Built for</span>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">A platform that fits the way your group already collects.</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { i: Store, t: "Markets", d: "Daily, weekly and monthly levies across thousands of shops and lines." },
              { i: Building, t: "Estates", d: "Service charge, security and sanitation dues for residents and tenants." },
              { i: Handshake, t: "Cooperatives", d: "Member contributions, savings and loan repayments handled centrally." },
              { i: Users, t: "Trade Associations", d: "Annual fees, conventions and special levies across chapters." },
            ].map((u) => (
              <div key={u.t} className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm transition-all hover:bg-white/10">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-emerald shadow-emerald">
                  <u.i className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold">{u.t}</h3>
                <p className="mt-2 text-sm text-white/70">{u.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section id="preview" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">Product</span>
              <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">One dashboard. Every collection. Total clarity.</h2>
              <p className="mt-4 text-muted-foreground">Admins see paid, partial, unpaid and overpaid vendors at a glance. Members see what they owe and what they've paid — in their pocket.</p>
              <ul className="mt-6 space-y-3">
                {[
                  "Live virtual account balances per vendor",
                  "Category-level breakdown of every collection",
                  "Underpayment and overpayment workflows",
                  "Branded, shareable receipts on every payment",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald/15 text-emerald"><Check className="h-3 w-3" /></span>
                    <span className="text-foreground">{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="navy" asChild><Link to="/dashboard">Open admin demo</Link></Button>
                <Button variant="outline" asChild><Link to="/vendor-portal">View vendor portal</Link></Button>
              </div>
            </div>
            <div className="relative rounded-3xl border border-border bg-gradient-to-br from-secondary to-background p-3 shadow-elevated">
              <div className="rounded-2xl bg-card p-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-destructive/60" />
                    <div className="h-3 w-3 rounded-full bg-warning/60" />
                    <div className="h-3 w-3 rounded-full bg-emerald/60" />
                  </div>
                  <p className="text-xs text-muted-foreground">duesly.app/dashboard</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { l: "Expected", v: "₦22.4M", c: "bg-secondary" },
                    { l: "Collected", v: "₦17.8M", c: "bg-emerald/10 text-emerald" },
                    { l: "Outstanding", v: "₦4.6M", c: "bg-warning/15" },
                  ].map((k) => (
                    <div key={k.l} className={`rounded-xl ${k.c} p-3`}>
                      <p className="text-[11px] text-muted-foreground">{k.l}</p>
                      <p className="mt-1 font-display text-lg font-bold">{k.v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-32 rounded-xl bg-gradient-to-br from-navy to-emerald/80 p-4">
                  <p className="text-xs text-white/70">Collection trend</p>
                  <svg viewBox="0 0 200 60" className="mt-2 h-16 w-full">
                    <polyline points="0,45 30,38 60,30 90,32 120,22 150,18 180,12 200,8"
                      fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="0,50 30,46 60,42 90,40 120,34 150,30 180,26 200,22"
                      fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                  </svg>
                </div>
                <div className="mt-4 space-y-2">
                  {[1,2,3].map((i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-emerald" />
                        <div>
                          <div className="h-2.5 w-24 rounded-full bg-secondary" />
                          <div className="mt-1.5 h-2 w-16 rounded-full bg-secondary/60" />
                        </div>
                      </div>
                      <div className="h-6 w-16 rounded-full bg-emerald/15" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center text-white shadow-elevated sm:p-14">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready to clean up your collections?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">Onboard your association in under 24 hours. No long contracts, no setup fees.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button variant="hero" size="lg" asChild><Link to="/signup">Create free account</Link></Button>
            <Button variant="outline" size="lg" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" asChild>
              <Link to="/super-admin">View super-admin demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-secondary/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <DueslyLogo />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Duesly. Built for trusted collections.</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
