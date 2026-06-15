# RFC 0017 — Rate limiting and account lockout

| Field      | Value                                                                    |
| ---------- | ------------------------------------------------------------------------ |
| Status     | Draft (stub)                                                             |
| Author     | Hani Chalouati                                                           |
| Created    | 2026-04-14                                                               |
| Target     | Phase 1 — rate limiting on auth endpoints + soft account lockout         |
| Supersedes | —                                                                        |
| Related    | 0012, 0016, 0018                                                         |

## 1. Summary

Introduce Hono middleware + in-DB counter for rate limiting on authentication-sensitive endpoints (login, password reset, MFA challenge, OTP send/verify, OAuth callback). Add **soft account lockout** with exponential backoff after repeated failures — never a permanent auto-lock. Independent of the Better Auth migration: ships against the current Supabase stack.

Phase 1 ships:

- Per-IP + per-account token buckets stored in Postgres (simple, no Redis dependency) or ElastiCache Redis (faster, more horizontal scale).
- Limits: login 5/min/IP + 10/hr/account, password reset 3/hr/account, OTP send 3/hr/account, OTP verify 5/15min/account.
- Soft lockout: after 5 consecutive failures, backoff starts at 30s and doubles per attempt to 15 min cap; resets on successful auth.
- `Retry-After` headers on 429 responses.
- Audit events (`sign_in.failure`, `account.lockout`) emitted to RFC 0016 log.
- Tests: load test confirms limits hold; integration test confirms lockout backs off.

## 2. Motivation

Attackers brute-force login endpoints. Without rate limiting, this is trivial even with argon2id hashing (CPU burns but requests succeed). Soft lockout frustrates the attacker without creating a DoS vector on legitimate accounts.

Ships independently — don't wait on the migration.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- Limits enforced on all auth endpoints (list above).
- Counters survive app restarts (DB-backed or Redis).
- Per-IP AND per-account limits (stops both distributed and targeted attacks).
- Legitimate users never permanently locked — soft backoff only.
- 429 responses with `Retry-After` and generic message (no info leak about whether the account exists).

### 3.2 Non-goals (phase 1)

- **CAPTCHA challenge.** Phase 2; only add if observed attack pressure.
- **WAF/Cloudflare Turnstile.** Orthogonal; runs at ALB/CloudFront, not in this RFC.
- **Behavioral / ML-based rate limiting.** Way out of scope.

## 4. Prior art in the codebase

- **Reused**: Hono middleware chain.
- **Replaced**: none — no current rate limiting on auth endpoints (this is a gap).
- **Orthogonal**: general API rate limiting (separate concern).

## 5. Conceptual model

Every rate-limited endpoint has an identity tuple: `(endpoint, scope, key)` where scope is `ip` or `account` and key is the IP or email/user_id. A counter per tuple, refilled at a rate, emptied per request. When empty: 429.

Soft lockout layers on top: a state column (`failure_count`, `locked_until`) on users drives exponential backoff for login specifically.

## 6. Interface contract

```ts
// Middleware
app.post('/sign-in', rateLimit({ ip: '5/min', account: '10/hour' }), handler);
app.post('/password-reset', rateLimit({ account: '3/hour' }), handler);
```

## 7. Security and trust boundaries

- IP extraction via `X-Forwarded-For` + trust boundary: ALB is trusted, downstream hops are not.
- Account-scoped limits look up user by **email normalized** (lowercase + trim) — same email, same bucket, regardless of case.
- 429 messages are generic: "Too many attempts. Try again later." — never reveal whether account exists.

## 8. Rollout plan

| Phase | Scope                                 | Artifacts               | Status |
| ----- | ------------------------------------- | ----------------------- | ------ |
| 1     | Hono middleware + soft lockout + audit | This RFC + phase-1 spec | Draft  |
| 2     | CAPTCHA challenge on sustained attack  | Phase 2 RFC             | Future |

## 9. Open questions

1. **Storage backend.** Postgres (simpler, one component) vs Redis (faster, horizontal). Proposal: Postgres in phase 1; revisit if latency hurts.
2. **Lockout duration cap.** 15 min vs 1 hour. Proposal: 15 min — longer is hostile to legitimate users on shared IPs.
3. **IPv6 bucketing.** Per /64 or per /128? Proposal: /64 — /128 lets attackers trivially rotate.
4. **Account-locked notification.** Email the user on lockout? Proposal: yes, but rate-limited (one per hour) to avoid mail-bomb amplification.

## 10. Alternatives considered

- **Hard lockout (permanent until admin unlock).** Rejected — trivial DoS against any known email.
- **Only IP-based limits.** Rejected — defeated by distributed attacks.
- **Only account-based limits.** Rejected — allows single attacker from one IP to enumerate many accounts at reduced rate.

## 11. References

- OWASP ASVS v4 V11.1 (authentication rate limiting)
- [RFC 0016 — Audit log](./0016-auth-audit-log.md)
