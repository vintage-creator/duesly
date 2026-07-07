import { Link } from "@tanstack/react-router";
import { DueslyLogo } from "@/components/duesly/logo";

export function NavigationFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40 py-8 mt-auto z-10 relative">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <DueslyLogo />
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Duesly Pay. Built for trusted collections by <a href="https://www.linkedin.com/in/israel-abazie" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground font-semibold">Vintage</a>.
        </p>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground hover:underline">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground hover:underline">Terms</Link>
          <Link to="/contact" className="hover:text-foreground hover:underline">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
