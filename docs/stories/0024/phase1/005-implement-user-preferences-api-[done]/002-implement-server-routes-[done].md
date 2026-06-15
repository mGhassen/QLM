---
story: ./story.md
status: done
layer: server
model: sonnet
files:
  - apps/server/src/routes/user-preferences.ts
  - apps/server/src/server.ts
  - apps/server/__tests__/routes/user-preferences.test.ts
validation:
  kind: route-test
  specs:
    - apps/server/__tests__/routes/user-preferences.test.ts
---

# Implement user-preferences server routes

Expose `GET` / `PATCH /api/me/preferences` as a Hono router wired into the authed API group, backed by the adapters from task 001. Returns empty `{ preferences: {} }` on missing row; atomically merges on PATCH; 60 rpm per-user PATCH rate limit; Zod-validates the patch body.

## Done when

- [ ] `createUserPreferencesRoutes(getRepositories, getCurrentAccountIdResolver)` exported from `apps/server/src/routes/user-preferences.ts` — mirrors the user-tokens factory signature so tests can inject a stub account resolver.
- [ ] `GET /` resolves `userId = getCurrentAccountIdResolver(c)`, returns `401` on null, otherwise calls `repos.userPreferences.get(userId)`; a `null` result returns `200 { preferences: {}, updated_at: null }` (no 404).
- [ ] `PATCH /` Zod-validates `UserPreferencesPayloadSchema.partial().passthrough()` (`400` on malformed), calls `repos.userPreferences.patch(userId, body)`, returns the resulting row.
- [ ] PATCH handler is rate-limited to 60 req/min per `userId` via `createRateLimiter({ windowMs: 60_000, max: 60 })`; over-limit returns `429` with a `retry-after` header.
- [ ] `server.ts` mounts the router at `api.route('/me/preferences', createUserPreferencesRoutes(getRepos, options?.getCurrentAccountId))` inside the existing `api` Hono instance, using the same `getCurrentAccountId` override plumbing as user-tokens.
- [ ] `__tests__/routes/user-preferences.test.ts` covers: empty GET returns `{ preferences: {} }`; PATCH merge preserves sibling keys across two sequential patches; malformed PATCH body → `400`; missing `x-test-account-id` header → `401`.
- [ ] `pnpm --filter server exec vitest run __tests__/routes/user-preferences.test.ts` is green.

## Notes

- Use `pnpm --filter server exec vitest run <spec>` not `pnpm --filter server test -- <spec>` — the `-- <args>` forwarding collides with the installed vitest's `--silent` flag.
- Build the `api` Hono app locally in the test (mirrors `user-tokens.test.ts`'s `makeTestApp`) rather than calling `createApp()`, which pulls in the chat route's `@mlc-ai/web-llm` ESM import and explodes under vitest.
- Rate-limit bucket key: `preferences:patch:${userId}`. Don't share the bucket across endpoints; the 60 rpm is preference-specific.
