<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## MireDo architecture
- The Tonic Sol-fa engine lives in `src/lib/miredo/` (pitch, rhythm, parser, layout, playback) and is pure TS with no React; UI renders only from the parsed `Score`. Why: rules from the ConceptionMireDo repo stay testable in `miredo.test.ts`.
- Written Sol-fa spelling is never rewritten; absolute pitch is computed separately (`NoteInfo`). Why: core MireDo rule (no enharmonic normalization).
- Headers, `{…}` directives, `<…>` chords, `[ ]` underline and `//` `///` breaks are a provisional demo syntax, not validated MireDo grammar; keep them labelled as such in UI copy.
- Line breaking uses real DOM widths from the hidden `Measurer` in `ScoreView`, with estimates in `layout.ts` only as SSR fallback. Why: estimates misjudge proportional fonts.
- Developer docs live as Markdown in `src/content/regles/NN-slug.md`, loaded with `import.meta.glob` in `src/lib/docs.ts` and rendered at `/regles/$slug`; fenced ```mrd``` / ```mrd-timing``` / ```mrd-pitch``` / ```mrd-path``` blocks render live previews. Why: docs are the single source and examples run through the real engine. Keep code excerpts in sync when changing the engine.
