import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DOCS } from "@/lib/docs";

export const Route = createFileRoute("/regles/")({
  head: () => ({
    meta: [
      { title: "Documentation développeur — Règles Tonic Sol-fa MireDo" },
      {
        name: "description",
        content: "Explication technique de chaque règle MireDo : analyse, code de rendu, CSS et aperçu en direct.",
      },
      { property: "og:title", content: "Documentation développeur — Règles Tonic Sol-fa MireDo" },
      { property: "og:description", content: "Chaque règle MireDo expliquée avec son code et son aperçu." },
    ],
  }),
  component: DocsIndex,
});

function DocsIndex() {
  return (
    <DocsLayout>
      <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Règles pour développeurs</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Chaque règle de la conception MireDo est expliquée techniquement : comment elle est lue, comment elle est
        affichée, avec le code et le CSS correspondants. Chaque exemple est rendu en direct par le moteur. Les fichiers
        source se trouvent dans <code className="doc-inline">src/content/regles/</code>.
      </p>
      <ol className="mt-10 grid gap-3 sm:grid-cols-2">
        {DOCS.map((d) => (
          <li key={d.slug}>
            <Link
              to="/regles/$slug"
              params={{ slug: d.slug }}
              className="group block h-full rounded-xl border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div className="font-mono text-xs text-muted-foreground">{String(d.order).padStart(2, "0")}</div>
              <div className="mt-1 font-display text-xl font-semibold group-hover:text-primary">{d.title}</div>
              <div className="mt-2 font-mono text-[11px] text-muted-foreground">{d.file}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {(d.body.match(/```mrd/g) ?? []).length} exemple(s) en direct
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </DocsLayout>
  );
}
