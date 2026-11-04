import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { DOCS } from "@/lib/docs";

export function DocsLayout({ children, active }: { children: ReactNode; active?: string }) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-[220px_minmax(0,1fr)] md:px-6">
        <nav className="md:sticky md:top-24 md:self-start">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Documentation dev</div>
          <ul className="flex gap-1 overflow-x-auto text-sm md:block md:space-y-0.5">
            <li>
              <Link
                to="/regles"
                activeOptions={{ exact: true }}
                className="block whitespace-nowrap rounded px-2 py-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                Sommaire
              </Link>
            </li>
            {DOCS.map((d) => (
              <li key={d.slug}>
                <Link
                  to="/regles/$slug"
                  params={{ slug: d.slug }}
                  className="block whitespace-nowrap rounded px-2 py-1 text-muted-foreground hover:bg-secondary hover:text-foreground md:whitespace-normal"
                  activeProps={{ className: "bg-secondary text-foreground" }}
                  data-active={active === d.slug || undefined}
                >
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
