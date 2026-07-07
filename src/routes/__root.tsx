import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportClientError } from "../lib/error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportClientError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" },
      { name: "theme-color", content: "#0b1a3a" },
      { title: "Duesly — Dues, Levies & Reconciliation for Associations" },
      {
        name: "description",
        content:
          "Duesly is a dedicated-account-powered dues, levy, and payment reconciliation platform for markets, estates, cooperatives, and trade groups.",
      },
      { name: "author", content: "Duesly" },
      { property: "og:title", content: "Duesly — Trusted Collections for Associations" },
      {
        property: "og:description",
        content:
          "Dedicated bank accounts, auto reconciliation, receipts, and reports — built for serious collections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
      },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/icon.svg" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          if (typeof window !== 'undefined') {
            window.global = window;
            if (typeof window.Buffer === 'undefined') {
              window.Buffer = {
                isBuffer: function() { return false; },
                from: function() { return []; },
                concat: function() { return []; }
              };
            }
          }
        `}} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  // Inactivity timeout logic
  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastActivity = Date.now();
    let checkInterval: any = null;
    let countdownInterval: any = null;

    const checkTimeout = () => {
      const user = localStorage.getItem("user");
      if (!user) return;

      const timeSinceLastActivity = Date.now() - lastActivity;
      const TIMEOUT_LIMIT = 15 * 60 * 1000; // 15 minutes
      const WARNING_THRESHOLD = TIMEOUT_LIMIT - 60 * 1000; // 14 minutes

      if (timeSinceLastActivity >= TIMEOUT_LIMIT) {
        handleLogout();
      } else if (timeSinceLastActivity >= WARNING_THRESHOLD) {
        const remaining = Math.max(0, Math.ceil((TIMEOUT_LIMIT - timeSinceLastActivity) / 1000));
        setSecondsRemaining(remaining);
        setShowTimeoutWarning(true);
      } else {
        setShowTimeoutWarning(false);
      }
    };

    const handleLogout = () => {
      localStorage.removeItem("user");
      sessionStorage.removeItem("vendorLookupQuery");
      setShowTimeoutWarning(false);
      clearInterval(checkInterval);
      clearInterval(countdownInterval);
      toast.info("Your session has timed out due to inactivity.", { duration: 6000 });
      router.navigate({ to: "/login" });
    };

    const resetActivity = () => {
      lastActivity = Date.now();
      setShowTimeoutWarning(false);
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    events.forEach((event) => {
      window.addEventListener(event, resetActivity, { passive: true });
    });

    // Check inactivity state every 5 seconds
    checkInterval = setInterval(checkTimeout, 5000);

    // Precise 1s ticker for warnings
    countdownInterval = setInterval(() => {
      const user = localStorage.getItem("user");
      if (!user) return;

      const timeSinceLastActivity = Date.now() - lastActivity;
      const TIMEOUT_LIMIT = 15 * 60 * 1000;

      if (timeSinceLastActivity >= TIMEOUT_LIMIT) {
        handleLogout();
      } else if (timeSinceLastActivity >= TIMEOUT_LIMIT - 60 * 1000) {
        const remaining = Math.max(0, Math.ceil((TIMEOUT_LIMIT - timeSinceLastActivity) / 1000));
        setSecondsRemaining(remaining);
      }
    }, 1000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetActivity);
      });
      clearInterval(checkInterval);
      clearInterval(countdownInterval);
    };
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("Service Worker registered successfully:", reg.scope))
          .catch((err) => console.error("Service Worker registration failed:", err));
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" />

      {/* Inactivity Timeout Alert Dialog */}
      <Dialog open={showTimeoutWarning} onOpenChange={(o) => {
        if (!o) {
          const events = ["mousedown", "keydown"];
          events.forEach(e => window.dispatchEvent(new Event(e)));
        }
      }}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-3xl p-6 bg-card border shadow-elevated animate-fade-in-up">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-navy text-base text-center">Session Security Alert</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-center text-sm text-muted-foreground space-y-3">
            <p>You have been inactive for a while. For security, your session will time out automatically in:</p>
            <p className="font-display text-3xl font-extrabold text-gold tracking-tight">{secondsRemaining}s</p>
          </div>
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="cursor-pointer w-full sm:w-auto"
              onClick={() => {
                localStorage.removeItem("user");
                sessionStorage.removeItem("vendorLookupQuery");
                setShowTimeoutWarning(false);
                router.navigate({ to: "/login" });
              }}
            >
              Log out
            </Button>
            <Button
              variant="hero"
              className="cursor-pointer w-full sm:w-auto"
              onClick={() => {
                const e = new Event("mousedown");
                window.dispatchEvent(e);
              }}
            >
              Keep working
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </QueryClientProvider>
  );
}
