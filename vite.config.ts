// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    server: {
      // Domaine Render utilisé par le Studio : autoriser ce host explicitement.
      allowedHosts: ["miredo-solfa-studio.onrender.com"],
      // CORS ouvert à toutes les origines, comme demandé.
      cors: true,
    },
    preview: {
      // Le serveur preview hérite normalement de server.allowedHosts et server.cors.
      // Les valeurs sont répétées ici pour garder le comportement explicite sur Render.
      allowedHosts: ["miredo-solfa-studio.onrender.com"],
      cors: true,
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
