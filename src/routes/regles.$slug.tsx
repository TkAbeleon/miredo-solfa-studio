import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocMarkdown } from "@/components/docs/DocMarkdown";
import { DOCS, getDoc } from "@/lib/docs";

export const Route = createFileRoute("/regles/$slug")({
  loader: ({ params }) => {
    const doc = getDoc(params.slug);
    if (!doc) throw notFound();
    return { slug: doc.slug, title: doc.title };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — Règles MireDo (dev)` },
          { name: "description", content: `Règle MireDo « ${loaderData.title} » : analyse, code de rendu et aperçu.` },
          { property: "og:title", content: `${loaderData.title} — Règles MireDo (dev)` },
          { property: "og:description", content: `Explication technique de « ${loaderData.title} » avec aperçu en direct.` },
        ]
      : [{ title: "Page introuvable — MireDo" }, { name: "robots", content: "noindex" }],
  }),
  component: DocPageView,
  notFoundComponent: () => (
    <DocsLayout>
      <h1 className="text-3xl font-semibold">Page introuvable</h1>
      <Link to="/regles" className="mt-4 inline-block text-primary underline">
        Retour au sommaire
      </Link>
    </DocsLayout>
  ),
});

function DocPageView() {
  const { slug } = Route.useLoaderData();
  const doc = getDoc(slug)!;
  const i = DOCS.findIndex((d) => d.slug === slug);
  const prev = DOCS[i - 1];
  const next = DOCS[i + 1];
  return (
    <DocsLayout active={slug}>
      <div className="mb-4 font-mono text-[11px] text-muted-foreground">{doc.file}</div>
      <DocMarkdown body={doc.body} />
      <div className="mt-14 flex justify-between gap-4 border-t pt-6 text-sm">
        {prev ? (
          <Link to="/regles/$slug" params={{ slug: prev.slug }} className="text-muted-foreground hover:text-primary">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to="/regles/$slug" params={{ slug: next.slug }} className="text-right text-muted-foreground hover:text-primary">
            {next.title} →
          </Link>
        )}
      </div>
    </DocsLayout>
  );
}
