# RFC 0012 — Better Auth adoption and hook-facade pattern

| Field      | Value                                                                       |
| ---------- | --------------------------------------------------------------------------- |
| Status     | Draft (stub)                                                                |
| Author     | Hani Chalouati                                                              |
| Created    | 2026-04-14                                                                  |
| Target     | Phase 1 — adopt Better Auth as auth provider behind existing hook facades   |
| Supersedes | —                                                                           |
| Related    | 0010, 0011, 0013 (MFA), 0014 (org), 0015 (cutover), 0019 (key management)   |

## 1. Summary

Adopt Better Auth as the authentication provider for the console. Preserve the 18 existing `use-*` React hooks as the **facade**; swap the implementation underneath from `@supabase/ssr` + Supabase Auth to Better Auth. Consumers (components, routes, features) see no signature change.

Phase 1 ships:

- Better Auth installed, configured for Postgres (shared DB, distinct tables), wired to the Hono app.
- Email/password signup, signin, signout, email verification, password reset via Better Auth core.
- All 18 React hooks re-implemented over Better Auth's client. Names, return shapes, and error contracts preserved.
- AWS SES configured as mail transport.
- Better Auth's own tables (`user`, `session`, `account`, `verification`) created alongside `public.users` (RFC 0010); a trigger keeps `public.users` in sync with Better Auth's `user` writes.

Later RFCs add OAuth (direct-to-spec, 18 providers), magic link (spec), MFA (0013), account linking (spec), organizations (0014).

## 2. Motivation

Better Auth is the best-fit library for this codebase's auth surface (see prior study: MFA + org + account linking map 1:1 to plugins). The library is young — mitigation is the **facade pattern**: hooks stay under the project's control, swap cost on future provider change is bounded.

Keeping Supabase temporarily means both stacks coexist. That is acceptable only for a bounded cutover window (RFC 0015).

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- Better Auth dependency installed, pinned, SBOM-indexed (RFC 0030 CI gates).
- Email/password flow works end-to-end against Better Auth's tables in dev and staging.
- All 18 hooks compile and pass type-checks with swapped internals. Component code changes: **zero**.
- Trigger syncs `better_auth.user` → `public.users` on insert/update/delete (keeps RFC 0010's identity table populated).
- Session cookie verified by RFC 0011 middleware; GUC set correctly on authenticated requests.
- Documented "how to add a new auth method" runbook.

### 3.2 Non-goals (phase 1)

- **OAuth providers.** Direct-to-spec after 0012 lands.
- **Magic link, email OTP.** Direct-to-spec.
- **MFA.** RFC 0013.
- **Account linking.** Direct-to-spec (design settled by 0012 facade).
- **Organization plugin.** RFC 0014.
- **Data migration from Supabase `auth.users`.** RFC 0015.

## 4. Prior art in the codebase

- **Reused**: `packages/supabase/src/hooks/*` — 18 hook names, return contracts. These become the facade.
- **Replaced**: `packages/supabase/src/clients/*.ts`, `@supabase/ssr` session handling.
- **Orthogonal**: 91 RLS policies (decoupled by RFC 0010/0011).

## 5. Conceptual model

Three layers:

1. **Better Auth core** — the library, unmodified. Owns its own tables.
2. **Adapter layer** (new) — thin glue binding Better Auth to: SES (email), our user trigger, our session cookie, our Hono router.
3. **Facade layer** — the 18 `use-*` hooks, unchanged signatures, re-implemented over Better Auth's client.

Consumers see only the facade. If Better Auth regresses, the adapter layer absorbs the change — hooks stay stable.

## 6. Architecture overview

- Better Auth's handler mounts at `/api/auth/*` on the Hono app.
- Browser: `createAuthClient()` from `better-auth/react` wraps fetch; hooks call it.
- Server: `auth.api.getSession(request)` inside the RFC 0011 middleware to produce the user_id for the GUC.
- DB: Better Auth owns `better_auth` schema; trigger `better_auth.user_sync → public.users` maintains identity mirror.

## 7. Interface contract (facade stability)

Each of the 18 hooks keeps its existing signature. Example:

```ts
// unchanged to callers
useSignInWithEmailPassword() → { mutate, isPending, error }
```

A conformance test suite asserts shape parity: given the same inputs, the hook resolves/rejects with the same mutation-state contract as the Supabase version.

## 8. Security and trust boundaries

- Better Auth `secret` stored in AWS Secrets Manager (RFC 0019).
- Cookie: `httpOnly`, `secure`, `sameSite=lax`. Policy detailed in RFC 0018.
- Password hashing: **argon2id** (override default). Rationale in RFC 0026 (HIBP + hashing).
- Email transport: AWS SES; DKIM/SPF/DMARC on domain; bounce handling via SNS.
- No auth errors leak user existence (generic "invalid credentials" for both unknown email and wrong password).

## 9. Rollout plan

| Phase | Scope                                                 | Artifacts               | Status |
| ----- | ----------------------------------------------------- | ----------------------- | ------ |
| 1     | Core email/password + facade swap + SES wiring        | This RFC + phase-1 spec | Draft  |
| 2     | OAuth, magic link, OTP, account linking (specs only)  | Per-feature specs       | Future |
| 3     | MFA (RFC 0013), Org (RFC 0014)                         | Dedicated RFCs          | Future |
| 4     | Cutover (RFC 0015)                                     | Dedicated RFC           | Future |

## 10. Open questions

1. **Hash migration strategy at login.** Better Auth verifies argon2id natively; imported bcrypt hashes need verify-then-rehash on login. Proposal: dual-verify plugin in phase 1 (argon2id new, bcrypt legacy) with `hash_algo` column; upgrade on successful login.
2. **Trigger direction.** Better Auth `user` → `public.users` (sync), or make `public.users` authoritative and Better Auth a consumer? Proposal: Better Auth authoritative for write, `public.users` is the sync mirror — simpler.
3. **Sessions table storage.** Better Auth default (DB) vs Redis. Proposal: DB in phase 1; Redis only if latency measured as a problem.
4. **Admin API exposure.** Mount `admin` plugin now (scaffolds RFC 0020/0021) or defer? Proposal: enable the plugin; don't expose routes until 0020.
5. **How do we version-pin Better Auth?** Semver range vs exact. Proposal: exact version pin + renovate bot, given library youth.

## 11. Alternatives considered

- **Auth.js v5.** Rejected — weaker MFA + org story; would force custom builds of features Better Auth ships as plugins.
- **GoTrue (Supabase Auth standalone).** Rejected for on-prem — extra service, more to ship and audit.
- **DIY (Arctic + Oslo).** Deferred — 2–4 weeks of build cost; revisit only if Better Auth becomes unmaintained.
- **SuperTokens.** Rejected — sidecar architecture conflicts with single-binary on-prem goal.

## 12. References

- [RFC 0010 — Identity data model](./0010-auth-identity-data-model.md)
- [RFC 0011 — Session middleware](./0011-auth-session-middleware.md)
- [Better Auth docs](https://better-auth.com/docs)
- [OWASP ASVS v4 — authentication](https://owasp.org/www-project-application-security-verification-standard/)
