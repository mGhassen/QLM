# RFC 0011 — Session context middleware and RLS enforcement

| Field      | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| Status     | Draft (stub)                                                         |
| Author     | Hani Chalouati                                                       |
| Created    | 2026-04-14                                                           |
| Target     | Phase 1 — Hono middleware that sets session GUC so RLS enforces      |
| Supersedes | —                                                                    |
| Related    | 0010 (identity model), 0012 (Better Auth), 0018 (session hardening)  |

## 1. Summary

Introduce Hono middleware that, per request, opens a Postgres connection and sets session-local GUCs (`app.user_id`, `app.jwt.claims`) inside a transaction so RLS policies evaluate against the authenticated principal. Replaces PostgREST's implicit JWT-claim injection.

Phase 1 ships:

- `withUserContext()` Hono middleware that extracts the Better Auth session, sets `SET LOCAL app.user_id = $1` on a scoped connection, runs the handler, and releases.
- **Fail-closed semantics**: if the session is missing/invalid, the GUC is cleared (NULL) — RLS then denies everything. No default allow.
- A pgTAP canary test (and an HTTP-level integration test) that proves: an authenticated user sees their data; an unauthenticated request sees nothing; a different user sees nothing.
- Admin bypass path: a separate `withAdminContext()` using a `BYPASSRLS` role, guarded by super-admin + AAL2 gating.

## 2. Motivation

When PostgREST is removed, nothing automatically propagates JWT claims into the Postgres session. RLS policies that call `auth.uid()` (reimplemented as `current_user_id()` per RFC 0010) return NULL and **every policy evaluates as anon**. The result is either total denial (if policies are written tightly) or data leakage (if any policy has a `USING (true)` fallback).

This middleware is the single most important piece of the migration. Miss it on one route → silent authorization bypass. Get it right once, centrally → safe everywhere.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- Middleware installed at the root Hono router — every request passes through it.
- Session resolved from Better Auth (cookie or Bearer); no claims trusted before verification.
- GUCs set via `SET LOCAL` inside a transaction started per request. Connection returned to pool after `COMMIT`/`ROLLBACK`.
- Fail-closed: missing/invalid session → GUC cleared → RLS denies. No silent anon access.
- Canary tests covering: authenticated user, unauthenticated, cross-user read attempt, admin bypass.
- Performance budget: < 2ms added per request at p95.

### 3.2 Non-goals (phase 1)

- **Rate limiting.** RFC 0017.
- **Session hardening policy (timeouts, revocation).** RFC 0018.
- **Audit logging of GUC-set events.** RFC 0016.

## 4. Prior art in the codebase

- **Reused**: `apps/server/src/lib/supabase.ts` token extraction pattern — shape of the middleware follows.
- **Replaced**: Supabase client's implicit JWT forwarding to PostgREST.
- **Orthogonal**: Better Auth's session retrieval (lives in RFC 0012).

## 5. Conceptual model

Every request has a **principal context**: (user_id, session_id, claims) or NULL (anon). The middleware's only job is to bind that context to the DB connection for the duration of the request, then unbind.

Two execution modes:

1. **User mode** (default): runs as `app_user` role, GUC set, RLS active.
2. **Admin mode** (opt-in, per route): runs as `app_admin` role with `BYPASSRLS`, GUC still set for audit attribution. Triggered by explicit route-level middleware, not by session claims.

## 6. Interface contract

```ts
// Applied globally
app.use('*', withUserContext({ authClient, pool }));

// Admin-only routes opt in
adminApp.use('*', requireSuperAdmin, withAdminContext({ pool }));
```

- Handlers receive a typed `c.var.db` (Kysely/Drizzle tx) that already has GUC set.
- Handlers do **not** reach for a raw pool connection — the linter forbids it.

## 7. Security and trust boundaries

- The middleware is the only code authorized to call `SET LOCAL app.user_id`. ESLint rule blocks direct calls elsewhere.
- `app_user` role has `NOBYPASSRLS`; even if the middleware is skipped, policies still run.
- `app_admin` role (`BYPASSRLS`) is only usable via `withAdminContext`, which requires super-admin + AAL2 (RFC 0013).
- No claims are logged verbatim (PII); only user_id and session_id after resolution (RFC 0029 log redaction).

## 8. Rollout plan

| Phase | Scope                                            | Artifacts               | Status |
| ----- | ------------------------------------------------ | ----------------------- | ------ |
| 1     | Middleware + canary tests + fail-closed semantics | This RFC + phase-1 spec | Draft  |

## 9. Open questions

1. **Connection-per-request vs transaction-pooling proxy.** RDS Proxy + pooling changes the GUC lifetime story. Proposal: direct pool (pgBouncer in transaction mode) in phase 1; revisit if scaling forces RDS Proxy.
2. **JSON claim vs individual GUCs.** Set the whole JWT as `app.jwt.claims` (JSON) or individual GUCs per claim? Proposal: both — `app.user_id` as a scalar for fast path, `app.jwt.claims` as JSON for policies that need richer context.
3. **Anonymous route exceptions.** Health, public docs, webhooks — do they skip the middleware or run with a `anonymous` GUC? Proposal: explicit allowlist skips the middleware entirely; no anonymous role exists.
4. **Failure mode on DB error after GUC set.** Rollback is automatic; do we also invalidate the session? Proposal: no — DB errors are infrastructure failures, not auth failures.

## 10. Alternatives considered

- **Re-introduce PostgREST.** Rejected — adds a service, negates on-prem simplification goal.
- **Application-level authz checks only (no RLS).** Rejected — defense in depth, 91 policies already written, SOC 2 favors multiple layers.
- **Connection-per-user pool.** Rejected — does not scale with thousands of users.

## 11. References

- [RFC 0010 — Identity data model](./0010-auth-identity-data-model.md)
- [RFC 0012 — Better Auth adoption](./0012-auth-better-auth-adoption.md)
- [RFC 0018 — Session hardening](./0018-auth-session-hardening.md)
