import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-6 border-b bg-card/90 px-4 backdrop-blur md:px-6">
      <Link to="/" className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold tracking-tight">
          Mire<span className="text-primary">Do</span>
        </span>
        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">d r m · .mrd</span>
      </Link>
      <nav className="flex gap-1 text-sm">
        <Link
          to="/"
          className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
          activeProps={{ className: "bg-secondary text-foreground" }}
          activeOptions={{ exact: true }}
        >
          Studio
        </Link>
        <Link
          to="/cas"
          className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
          activeProps={{ className: "bg-secondary text-foreground" }}
        >
          Cas couverts
        </Link>
      </nav>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </header>
  );
}
