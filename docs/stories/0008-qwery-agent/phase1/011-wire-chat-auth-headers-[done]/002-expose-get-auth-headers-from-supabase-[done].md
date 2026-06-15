---
story: ./story.md
status: done
layer: adapter
model: sonnet
files:
  - packages/supabase/src/auth-headers.ts
  - packages/supabase/package.json
validation:
  kind: typecheck-only
---

# Expose getAuthHeaders from @qlm/supabase

Add a browser-side helper that reads the current Supabase session and returns `{ Authorization: 'Bearer <token>' }` when signed in, `{}` otherwise — callable from feature packages that cannot import `apps/web/src/lib/repositories/api-client.ts`.

## Done when

- [ ] New file `packages/supabase/src/auth-headers.ts` exports `async function getAuthHeaders(): Promise<Record<string, string>>` that uses `getSupabaseBrowserClient()` + `auth.getSession()` and returns an empty object when no session.
- [ ] `packages/supabase/package.json` `exports` map adds `"./auth-headers": "./src/auth-headers.ts"`.
- [ ] `pnpm --filter @qlm/supabase typecheck` passes.
- [ ] No server-only imports; this file is browser-safe (re-uses `@supabase/ssr`'s browser client like `getSupabaseBrowserClient`).

## Notes

- Returning `{}` when anonymous is deliberate — the chat endpoint responds 401/403, not 500, so callers don't need to branch.
- Do not duplicate `getAuthHeaders` from `apps/web/src/lib/repositories/api-client.ts`. A later cleanup can switch that file to import from `@qlm/supabase/auth-headers`, but that refactor is out of this task's scope.
