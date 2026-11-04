import { useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScoreView } from "@/components/score/ScoreView";
import { PitchTable, TimingTable } from "@/components/score/Tables";
import { parseScore } from "@/lib/miredo/parser";
import { computePath } from "@/lib/miredo/playback";
import { cn } from "@/lib/utils";

/** Bloc ```mrd``` : code source + aperçu rendu par le moteur réel. */
function LiveExample({ code, extra }: { code: string; extra: "timing" | "pitch" | "path" | null }) {
  const score = useMemo(() => parseScore(code), [code]);
  return (
    <figure className="not-prose my-6 overflow-hidden rounded-xl border bg-card">
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="border-b bg-editor md:border-b-0 md:border-r md:border-editor-foreground/10">
          <div className="border-b border-editor-foreground/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-editor-muted">
            Code .mrd
          </div>
          <pre className="overflow-x-auto p-3 font-mono text-xs leading-5 text-editor-foreground">{code}</pre>
        </div>
        <div className="min-w-0">
          <div className="border-b px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Aperçu du résultat
          </div>
          <div className="overflow-x-auto p-4">
            <div className="w-max min-w-full rounded-lg bg-paper px-4 pb-1 pt-4 shadow-sm">
              <ScoreView score={score} variant="inline" width={520} />
            </div>
          </div>
        </div>
      </div>
      {score.diagnostics.length > 0 && (
        <ul className="border-t px-4 py-2 text-xs">
          {score.diagnostics.map((d, i) => (
            <li
              key={i}
              className={cn(
                d.level === "error" ? "text-destructive" : d.level === "warning" ? "text-warn" : "text-muted-foreground",
              )}
            >
              {d.level === "error" ? "Erreur" : d.level === "warning" ? "Attention" : "Info"} — {d.message}
            </li>
          ))}
        </ul>
      )}
      {extra && (
        <figcaption className="border-t bg-muted/40 px-4 py-3 text-xs">
          {extra === "timing" && <TimingTable score={score} />}
          {extra === "pitch" && <PitchTable score={score} />}
          {extra === "path" && (
            <div>
              <span className="text-muted-foreground">Parcours de lecture (mesures) : </span>
              <span className="font-mono">{computePath(score).map((m) => m + 1).join(" → ")}</span>
            </div>
          )}
        </figcaption>
      )}
    </figure>
  );
}

export function DocMarkdown({ body }: { body: string }) {
  return (
    <div className="doc-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const lang = /language-([\w-]+)/.exec(className ?? "")?.[1];
            const text = String(children ?? "").replace(/\n$/, "");
            if (lang?.startsWith("mrd")) {
              const extra = (lang.split("-")[1] ?? null) as "timing" | "pitch" | "path" | null;
              return <LiveExample code={text} extra={extra} />;
            }
            if (lang) return <CodeBlock lang={lang}>{text}</CodeBlock>;
            return <code className="doc-inline">{children}</code>;
          },
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ lang, children }: { lang: string; children: ReactNode }) {
  return (
    <div className="not-prose my-4 overflow-hidden rounded-lg bg-editor">
      <div className="border-b border-editor-foreground/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-editor-muted">
        {lang}
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-5 text-editor-foreground">{children}</pre>
    </div>
  );
}
