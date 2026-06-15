---
spec: docs/specs/0008-qwery-agent-phase1.md
spec_sections:
  - "#74-server-appsserver"
  - "#1-resolved-open-questions"
status: skipped
started: null
finished: 2026-04-14
blocks:
  - 008-add-credits-banner-and-precheck
blocked_by: []
---

# Expose billing balance endpoint

## Goal

Verify — and add if missing — a lightweight `GET /api/billing/balance` endpoint that returns the active organization's credit balance, so the client-side credits pre-check (story 008) has an endpoint to call without sending a full chat request.

## Scope

**In scope**

- Audit `apps/server/src/routes/` for an existing balance endpoint. The chat route at `apps/server/src/routes/chat.ts` already calls `organizationRepository.getBillingData(organizationId)` to decide the HTTP 402 gate — if that data is already exposed via another route, confirm the shape and skip creation.
- If no endpoint is exposed, add `GET /api/billing/balance` to the organizations or billing route tree, reusing `IOrganizationRepository.getBillingData(organizationId)` and returning `{ balance: number }` (or the existing billing-data shape).
- Plumb the route through `apps/server/src/server.ts` so it is reachable.
- Add the matching client caller as a thin wrapper inside `useShell().billing` or, if that namespace does not exist, add a minimal `billing` resource under `packages/shell-runtime/src/resources/` consistent with the pattern used by story 003.

**Out of scope** (forces honest slicing)

- Mid-stream HTTP 402 handling — that's consumer UX and lives in story 008.
- Any change to the billing business logic itself (pricing, credits top-up flow).
- Rate limiting / caching of the balance endpoint — revisit if hot-path concerns arise.

## Acceptance criteria

- [ ] `GET /api/billing/balance` returns the active org's balance as JSON (`{ balance: <number> }`) for an authenticated session; 401 otherwise.
- [ ] The endpoint requires no query parameters (org is resolved from the session context), matching the pattern used by `chat.ts`.
- [ ] `useShell().billing.getBalance()` (or equivalent) is typed and awaits the response.
- [ ] Server unit test covers the happy path + 401 path.
- [ ] `pnpm typecheck` and `pnpm --filter server test` pass.

## Tasks

Populated by `/start-story`.

## Demo / verification

```bash
pnpm --filter server dev
curl -sS --cookie "<session-cookie>" http://localhost:4096/api/billing/balance
# Expected: {"balance": <number>}
```

## Questions surfaced

- <bullet>

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.

## Skipped because

A balance endpoint already exists at `apps/web/src/routes/api/billing/status.ts` (`GET /api/billing/status?orgSlug=...` returns `{ balance, invoicesCount }`, backed by `GetOrganizationBillingService`). qwery-enterprise uses the **same** endpoint and the **same** domain service, with **no** shell-runtime billing resource — consumers fetch directly. We follow that pattern.

The spec assumed a new server endpoint at `apps/server` was needed; verifying showed this was already done web-side. No new code is required at this layer. The thin client-side hook needed for story 008's credits pre-check (e.g. `useBillingBalance()` calling `/api/billing/status`) is pulled into story 008 where it is consumed — the hook has no standalone value without the banner UX.

Spec deviation logged in `docs/specs/0008-qwery-agent-phase1.md ## Changelog`.
