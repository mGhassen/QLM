# RFC 0018 — Session hardening

| Field      | Value                                                                    |
| ---------- | ------------------------------------------------------------------------ |
| Status     | Draft (stub)                                                             |
| Author     | Hani Chalouati                                                           |
| Created    | 2026-04-14                                                               |
| Target     | Phase 1 — cookie flags, session timeout policy, forced-revocation triggers |
| Supersedes | —                                                                        |
| Related    | 0011, 0012, 0016, 0019                                                   |

## 1. Summary

Define and enforce the session policy: cookie flags, idle/absolute timeouts, revocation triggers (password change, role change, MFA change, admin action), token storage (hashed at rest), concurrent session limits. Largely configuration + a small revocation service; ships partially independently of the Better Auth migration.

Phase 1 ships:

- Cookie attributes: `httpOnly`, `secure`, `sameSite=lax`, `path=/`, `domain=<app-domain>`, no expiration (session cookie rotated server-side).
- Session TTLs: 24h idle, 30d absolute; AAL2 downgrades to AAL1 after 30 min idle.
- Revocation triggers wired: password change → revoke all, MFA change → revoke all except current, role change (elevation) → revoke all, admin `revoke_sessions` action.
- Sessions stored **hashed** (SHA-256 of token) in DB; plaintext token only in the cookie.
- Concurrent session limit: 10 per user (configurable per-org later).
- Sign-out revokes the current session server-side (not just clears cookie).

## 2. Motivation

Cookie misconfig + long-lived sessions are the most common real-world auth bug. Centralizing the policy makes it reviewable and testable. Hashed-at-rest protects the session list against DB dumps.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- All above cookie flags set on every `Set-Cookie` from the auth handler.
- `session` table columns: `id`, `user_id`, `token_hash`, `created_at`, `last_seen_at`, `expires_at`, `ip`, `user_agent`, `aal`, `revoked_at`.
- Middleware (RFC 0011) rejects expired / revoked sessions (idle + absolute + revoked).
- Revocation triggers enumerated and wired to Better Auth hooks.
- Admin action: revoke all sessions for a user.
- Audit events for every revocation reason.

### 3.2 Non-goals (phase 1)

- **IP-pinned sessions.** Breaks mobile users; skip.
- **Device trust / fingerprinting.** Phase 2.
- **Per-org session policy.** Phase 2.

## 4. Prior art in the codebase

- **Reused**: `@supabase/ssr` cookie handling pattern (replaced by Better Auth but logic mirrors).
- **Replaced**: any Supabase-default cookie settings.
- **Orthogonal**: CSRF defense (Better Auth's CSRF protection stays on).

## 5. Conceptual model

A **session** is a server-side record. The cookie is a bearer token that **looks up** the session by hash. Revocation is a database write, not a cookie clear — the cookie can live on but will be rejected.

## 6. Interface contract

No new hooks. Existing `useSignOut`, `useSession` work against the updated store. New admin action:

```ts
useAdminRevokeSessions(userId) → { mutate }  // revokes all sessions for user
```

## 7. Security and trust boundaries

- Token entropy: ≥128 bits from CSPRNG.
- Token storage: SHA-256 hash. No HMAC needed since DB-read is the verification path.
- Cookie scope: app domain only, not `.parent.com`.
- Revocation happens at the DB; middleware is the enforcement point.

## 8. Rollout plan

| Phase | Scope                                  | Artifacts               | Status |
| ----- | -------------------------------------- | ----------------------- | ------ |
| 1     | Cookie flags + TTL + revocation triggers | This RFC + phase-1 spec | Draft  |
| 2     | Device trust / per-org policy           | Phase 2 RFC             | Future |

## 9. Open questions

1. **Idle vs absolute timeout values.** 24h/30d is a guess; what do analogous products do? Proposal: match GitHub / Vercel (~14d idle, 90d absolute) unless customer ops has specific input.
2. **`sameSite`: `lax` or `strict`?** `strict` breaks OAuth return redirects. Proposal: `lax`.
3. **Refresh tokens.** Better Auth has the option; do we use them (shorter access tokens + refresh)? Proposal: no — adds complexity, current security posture fine with hashed DB sessions.
4. **Sign-out everywhere UX.** Explicit button in admin console or in user settings? Proposal: both.

## 10. Alternatives considered

- **JWT-only sessions (no DB lookup).** Rejected — can't revoke before expiration.
- **Plaintext tokens in DB.** Rejected — DB dump = all live sessions.

## 11. References

- OWASP ASVS v4 V3 (session management)
- [RFC 0011 — Session middleware](./0011-auth-session-middleware.md)
