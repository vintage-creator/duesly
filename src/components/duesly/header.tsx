import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DueslyLogo } from "@/components/duesly/logo";
import { ChevronDown, Menu, X, Store, Building, Handshake, Users } from "lucide-react";
import { useState, useEffect } from "react";

export function NavigationHeader({ activeSolution }: { activeSolution?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser) {
      try {
        setUser(JSON.parse(localUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const getDashboardLink = () => {
    if (!user) return "/login";
    if (user.role === "super-admin") return "/super-admin";
    if (user.role === "vendor") return "/vendor-portal";
    return "/dashboard";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <DueslyLogo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <div className="relative">
            <button
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
              onMouseEnter={() => setDropdownOpen(true)}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              Solutions <ChevronDown className="h-4 w-4" />
            </button>
            {dropdownOpen && (
              <div
                className="absolute left-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-soft z-50"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <Link 
                  to="/solutions/markets" 
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-secondary ${activeSolution === "markets" ? "font-semibold text-emerald bg-secondary/50" : ""}`}
                >
                  <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>Market Unions</span>
                </Link>
                <Link 
                  to="/solutions/estates" 
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-secondary ${activeSolution === "estates" ? "font-semibold text-emerald bg-secondary/50" : ""}`}
                >
                  <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>Residential Estates</span>
                </Link>
                <Link 
                  to="/solutions/cooperatives" 
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-secondary ${activeSolution === "cooperatives" ? "font-semibold text-emerald bg-secondary/50" : ""}`}
                >
                  <Handshake className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>Cooperatives</span>
                </Link>
                <Link 
                  to="/solutions/trade-groups" 
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-secondary ${activeSolution === "trade-groups" ? "font-semibold text-emerald bg-secondary/50" : ""}`}
                >
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>Trade Groups</span>
                </Link>
              </div>
            )}
          </div>

          <a href="/#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            How it Works
          </a>
          <a href="/#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Pricing
          </a>
          <a href="/#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            FAQ
          </a>
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <Button variant="hero" size="sm" asChild className="cursor-pointer">
              <Link to={getDashboardLink()}>Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                Sign In
              </Link>
              <Button variant="hero" size="sm" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 hover:bg-secondary md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="border-b border-border bg-card px-4 py-4 md:hidden space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3">Solutions</p>
          <div className="grid grid-cols-2 gap-2 px-3">
            <Link to="/solutions/markets" className={`flex items-center gap-1.5 text-sm hover:underline ${activeSolution === "markets" ? "font-semibold text-emerald" : ""}`} onClick={() => setMenuOpen(false)}>
              <Store className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Markets</span>
            </Link>
            <Link to="/solutions/estates" className={`flex items-center gap-1.5 text-sm hover:underline ${activeSolution === "estates" ? "font-semibold text-emerald" : ""}`} onClick={() => setMenuOpen(false)}>
              <Building className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Estates</span>
            </Link>
            <Link to="/solutions/cooperatives" className={`flex items-center gap-1.5 text-sm hover:underline ${activeSolution === "cooperatives" ? "font-semibold text-emerald" : ""}`} onClick={() => setMenuOpen(false)}>
              <Handshake className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Cooperatives</span>
            </Link>
            <Link to="/solutions/trade-groups" className={`flex items-center gap-1.5 text-sm hover:underline ${activeSolution === "trade-groups" ? "font-semibold text-emerald" : ""}`} onClick={() => setMenuOpen(false)}>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Trade Groups</span>
            </Link>
          </div>
          <hr className="border-border" />
          <div className="space-y-2">
            <a
              href="/#how-it-works"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary"
              onClick={() => setMenuOpen(false)}
            >
              How it Works
            </a>
            <a
              href="/#pricing"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary"
              onClick={() => setMenuOpen(false)}
            >
              Pricing
            </a>
            <a
              href="/#faq"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary"
              onClick={() => setMenuOpen(false)}
            >
              FAQ
            </a>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {user ? (
                <Button variant="hero" className="col-span-2 cursor-pointer" asChild onClick={() => setMenuOpen(false)}>
                  <Link to={getDashboardLink()}>Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" asChild onClick={() => setMenuOpen(false)}>
                    <Link to="/login">Sign in</Link>
                  </Button>
                  <Button variant="hero" asChild onClick={() => setMenuOpen(false)}>
                    <Link to="/signup">Get started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
