# RFC 0010 — Identity data model

| Field      | Value                                                          |
| ---------- | -------------------------------------------------------------- |
| Status     | Draft (stub)                                                   |
| Author     | Hani Chalouati                                                 |
| Created    | 2026-04-14                                                     |
| Target     | Phase 1 — replace `auth.users` as the identity source of truth |
| Supersedes | —                                                              |
| Related    | 0011 (session middleware), 0012 (Better Auth adoption), 0015 (data cutover) |

## 1. Summary

Replace Supabase's `auth.users` as the cross-schema identity anchor with a first-class `public.users` table owned by the application. Introduce `public.current_user_id()` as the single source that RLS policies and app code consult to identify the current principal — decoupling RLS from any specific auth provider (Supabase Auth, GoTrue, Better Auth, future).

Phase 1 ships:

- `public.users` table with the fields actually used by the app (`id`, `email`, `email_confirmed_at`, `raw_user_meta_data`, `raw_app_meta_data`, timestamps).
- `public.current_user_id()` SQL function reading from a session-local GUC (set by RFC 0011 middleware).
- Transition plan: `auth.users` becomes a view over `public.users` so the 91 existing RLS policies compile unchanged during migration.
- FK strategy: organization/account/notebook tables continue to reference the user `id` (same UUID space) — only the target table changes.

Later phases drop the `auth.users` view and retire Supabase's `auth` schema.

## 2. Motivation

91 RLS policies and multiple FKs reference `auth.uid()` / `auth.users`. This is the single biggest obstacle to changing auth provider. Extracting identity into `public` makes auth pluggable: Better Auth, GoTrue, or a future replacement all populate the same table.

Secondary driver: managed Postgres providers (RDS, Cloud SQL, Azure Flexible) don't ship `pgjwt`, which Supabase's `auth.uid()` depends on. A GUC-based `current_user_id()` works on any Postgres.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- `public.users` table exists with columns matching current usage.
- `public.current_user_id()` returns the session user UUID or NULL (fail-closed).
- `auth.uid()` is reimplemented as a thin wrapper over `current_user_id()` — all 91 RLS policies continue to evaluate correctly.
- `auth.users` is a view projecting `public.users` so existing FKs and policies referencing `auth.users` keep working.
- Canary test: a pgTAP test asserts that setting the GUC produces the expected RLS behavior.

### 3.2 Non-goals (phase 1)

- **Data migration from `auth.users` → `public.users`.** RFC 0015.
- **Better Auth integration.** RFC 0012.
- **Removing the `auth.users` view.** Phase 2 (post-cutover cleanup).

## 4. Prior art in the codebase

- **Reused**: `apps/web/supabase/schemas/04-initial-tables.sql` (accounts), existing RLS policies using `auth.uid()`.
- **Replaced**: reliance on `auth.users` as the FK target for user-owned data.
- **Orthogonal**: organization/membership tables (0014 handles them).

## 5. Conceptual model

Identity has three concerns, currently tangled inside `auth.users`:

1. **Principal ID** — the UUID that appears in FKs and RLS. Must outlive any auth provider.
2. **Credentials** — password hash, OAuth identities, MFA factors. Owned by the auth provider.
3. **Profile** — email, display name, avatar URL. Shared.

Phase 1 separates (1) and (3) into `public.users` (stable, app-owned) from (2) which remains in whatever auth schema the provider uses. This is the decoupling that lets RFC 0012 swap provider without touching 91 RLS policies.

## 6. Data model (conceptual)

`public.users`: `id uuid PK`, `email citext UNIQUE`, `email_confirmed_at timestamptz`, `raw_user_meta_data jsonb`, `raw_app_meta_data jsonb`, `created_at`, `updated_at`, `deleted_at` (soft delete).

`public.current_user_id()`: `RETURNS uuid` reads `current_setting('app.user_id', true)::uuid`, returns NULL if unset. `STABLE` + `SECURITY INVOKER`.

## 7. Security and trust boundaries

- `current_user_id()` must never trust claims from untrusted sources; only the middleware (RFC 0011) sets the GUC, and only from a verified Better Auth session.
- `public.users` has RLS enabled: users read their own row; admins read all; inserts come from the auth provider only (restricted DB role, see RFC 0012's least-privilege roles).
- The `auth.users` view runs `SECURITY INVOKER` — callers cannot escalate through it.

## 8. Rollout plan

| Phase | Scope                                                                     | Artifacts                   | Status |
| ----- | ------------------------------------------------------------------------- | --------------------------- | ------ |
| 1     | `public.users`, `current_user_id()`, `auth.uid()` rewrite, `auth.users` view | This RFC + phase-1 spec     | Draft  |
| 2     | Drop `auth.users` view after cutover                                       | Phase 2 spec (post-0015)    | Future |

## 9. Open questions

1. **Soft delete vs hard delete.** Does `deleted_at` cascade to owned entities, or do we null out FKs? Proposal: soft delete on users, hard delete after 90 days via scheduled job.
2. **`email` uniqueness under case.** `citext` or `lower(email)` unique index? Proposal: `citext` — aligns with Supabase behavior.
3. **Meta columns retention.** Do we keep `raw_app_meta_data` / `raw_user_meta_data` or migrate to typed columns? Proposal: keep `jsonb` columns for now; typed extraction is a later cleanup.
4. **Schema placement.** `public.users` or a dedicated `identity` schema? Proposal: `public` for minimal churn on existing FKs.

## 10. Alternatives considered

- **Keep `auth.users` as-is, change only the auth provider.** Rejected — couples the schema to whichever provider runs; makes migration from Better Auth (if ever needed) as painful as migrating from Supabase now.
- **Move identity to a separate `identity` schema.** Deferred — clean but forces mass FK rewrites across 40+ schema files.

## 11. References

- `apps/web/supabase/schemas/04-initial-tables.sql`
- [RFC 0011 — Session context middleware](./0011-auth-session-middleware.md)
- [RFC 0012 — Better Auth adoption](./0012-auth-better-auth-adoption.md)
