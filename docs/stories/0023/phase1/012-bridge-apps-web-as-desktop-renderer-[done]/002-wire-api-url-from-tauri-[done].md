---
story: ./story.md
status: done
layer: adapter
model: sonnet
files:
  - apps/web/src/lib/repositories/api-client.ts
  - apps/web/src/globals.d.ts
validation:
  kind: typecheck-only
---

# Wire API URL from Tauri

`apps/web` needs to route `/api/...` requests to the Bun sidecar when loaded inside the Tauri webview (the renderer is served from `tauri://localhost`, so relative `/api` paths go nowhere). The sidecar port changes per launch, so the Rust shell already injects `window.__GUEPARD_API_URL = 'http://127.0.0.1:<port>'` via `window.eval` at startup.

## Done when

- [ ] `apps/web/src/globals.d.ts` (new) declares `interface Window { __GUEPARD_API_URL?: string; }` with an `export {};` to keep it a module.
- [ ] `apps/web/src/lib/repositories/api-client.ts` `getApiBaseUrl()` reads the Tauri-injected URL first:
  ```ts
  if (typeof window !== 'undefined' && typeof window.__GUEPARD_API_URL === 'string' && window.__GUEPARD_API_URL.length > 0) {
    return `${window.__GUEPARD_API_URL}/api`;
  }
  ```
  Fallback to the existing `process.env` + `import.meta.env` + `/api` chain unchanged.
- [ ] All existing callers keep working: `fetch(\`${getApiBaseUrl()}${endpoint}\`)` now resolves to `http://127.0.0.1:<port>/api${endpoint}` in desktop runtime, and to `/api${endpoint}` in web.
- [ ] `pnpm typecheck` green.

## Notes

- Don't add an `|| '/'` trim — the spec guarantees the injected URL has no trailing slash (see `lib.rs` spawn block).
- The Supabase client still reads `VITE_SUPABASE_URL` at build time; that's intentional for phase 1 (spec §3.3 server-URL change flow only rewires the sidecar's target, not the SPA's Supabase target).
- Spec anchor: `#75-presentation-appsweb` (the "All other auth screens reused unchanged" bullet relies on the SPA's API client finding the sidecar).
