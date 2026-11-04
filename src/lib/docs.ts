// Documentation développeur : fichiers Markdown de src/content/regles/, chargés au build.

const files = import.meta.glob("../content/regles/*.md", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

export interface DocPage {
  slug: string;
  order: number;
  title: string;
  file: string;
  body: string;
}

export const DOCS: DocPage[] = Object.entries(files)
  .map(([path, body]) => {
    const name = path.split("/").pop()!.replace(/\.md$/, "");
    const m = /^(\d+)-(.+)$/.exec(name);
    const title = /^#\s+(.+)$/m.exec(body)?.[1] ?? name;
    return { slug: m?.[2] ?? name, order: Number(m?.[1] ?? 99), title, file: `src/content/regles/${name}.md`, body };
  })
  .sort((a, b) => a.order - b.order);

export const getDoc = (slug: string) => DOCS.find((d) => d.slug === slug);
