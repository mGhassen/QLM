# RFC 0015 — Identity data cutover

| Field      | Value                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Status     | Draft (stub)                                                           |
| Author     | Hani Chalouati                                                         |
| Created    | 2026-04-14                                                             |
| Target     | Phase 1 — one-shot migration from Supabase `auth.users` to Better Auth |
| Supersedes | —                                                                      |
| Related    | 0010, 0012, 0013, 0014, 0025                                           |

## 1. Summary

One-shot migration of all identity data from Supabase's `auth.users` / `auth.identities` / `auth.mfa_factors` into the Better Auth tables + `public.users` mirror. Terminal, irreversible step of the migration — gated on a clean pen test (RFC 0031) and validated in staging first.

Phase 1 ships:

- Export script: `auth.users` → JSONL; includes bcrypt password hashes, OAuth identities, MFA TOTP secrets (encrypted).
- Import script: writes `public.users`, Better Auth `user`, `account` (one row per OAuth identity), `two_factor` (for MFA factors), with `password_algorithm = 'bcrypt'` on legacy rows.
- Dual-verify plugin enabled on Better Auth: verifies bcrypt hashes natively; on successful login, re-hashes to argon2id and clears `password_algorithm` flag.
- Cutover runbook: maintenance window (~30 min), feature flag flip, DNS unchanged.
- Rollback procedure: documented, tested in staging, but after the flip **rollback requires replaying auth changes from audit log** — anything after the flip cannot go backward automatically.

## 2. Motivation

The other 12 RFCs can be drafted, reviewed, and even partially implemented without changing production data. This RFC is the one that touches user data in production. It deserves its own review, its own dry run, and its own gate.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- Export is idempotent and restartable; can be re-run against staging any number of times.
- Import preserves: user id (UUID, same value), email, email confirmation state, OAuth identities, MFA TOTP secrets, recovery codes (if any), created_at.
- Zero password resets required — users can sign in with their existing password immediately after cutover.
- Dual-verify: bcrypt check works on legacy; new signups and re-hashed legacy users use argon2id.
- Staging dry run with anonymized prod data passes before any prod cutover.
- Pen test gate (RFC 0031) clean before the production window.

### 3.2 Non-goals (phase 1)

- **Zero-downtime cutover.** Short maintenance window is acceptable; zero-downtime adds complexity not justified for this step.
- **Automated post-cutover rollback.** Rollback is manual and operator-driven; complexity of automation isn't worth it for a one-shot step.
- **Data from non-user tables.** Schemas stay put; only identity moves.

## 4. Prior art in the codebase

- **Reused**: existing user UUIDs stay the same — every FK in the DB is untouched.
- **Replaced**: `auth.users` table content migrates to `public.users` + Better Auth tables.
- **Orthogonal**: storage (RFC 0022), audit log (RFC 0016) run their own migrations.

## 5. Conceptual model

Identity has three migratable surfaces:

1. **User rows** — `auth.users` → `public.users` + Better Auth `user`.
2. **OAuth identities** — `auth.identities` → Better Auth `account` (one row per provider link).
3. **MFA factors** — `auth.mfa_factors` → Better Auth `two_factor` (TOTP secret decrypted from Supabase's format, re-encrypted under our KMS).

Passwords don't migrate — they are hashes. The app learns to verify legacy bcrypt via the dual-verify plugin.

## 6. Cutover runbook (sketch)

1. Announce maintenance window (ops + customer comms).
2. Set app to read-only mode (feature flag).
3. Final `auth.*` export (incremental over staging baseline).
4. Verify row counts and spot-check hashes.
5. Run import transactionally.
6. Flip auth flag to Better Auth.
7. Smoke test: admin login, user login, OAuth, MFA challenge.
8. Exit read-only mode.
9. Monitor error rates for 24h.
10. Drop Supabase Auth config after 14-day holdback period.

## 7. Security and trust boundaries

- Export runs from a hardened bastion; service role key used, then rotated.
- Export files encrypted (KMS) during transit and at rest in S3; 30-day retention then deleted.
- MFA TOTP secrets re-encrypted, never logged.
- Import script runs as `app_migrate` role (DDL+DML, BYPASSRLS); role disabled after cutover.
- Audit log records every imported row (count, not content).

## 8. Rollout plan

| Phase | Scope                                         | Artifacts               | Status |
| ----- | --------------------------------------------- | ----------------------- | ------ |
| 1     | Export + import + dual-verify + cutover       | This RFC + phase-1 spec | Draft  |
| 2     | Post-cutover: drop `auth.users` view, retire Supabase Auth config | Phase 2 spec | Future |

## 9. Open questions

1. **Dual-verify implementation.** Better Auth hook or custom password verifier plugin? Proposal: custom plugin — more control.
2. **Re-hash cadence.** On every successful login, or lazy migrate? Proposal: on every login (cheap once hash is already verified).
3. **Stale user handling.** Users inactive for >6 months — migrate them anyway? Proposal: yes, no filtering; deletion is a separate lifecycle concern.
4. **Session invalidation at cutover.** Force re-login for all users, or honor Supabase-issued sessions briefly? Proposal: force re-login — cleaner audit trail.

## 10. Alternatives considered

- **Rolling migration (per-user lazy migrate on login).** Rejected — indefinite dual-stack period; hurts audit story.
- **Keep bcrypt forever.** Rejected — bcrypt is acceptable but argon2id is preferred by current OWASP guidance.

## 11. References

- [Better Auth password import guide](https://better-auth.com/docs/concepts/users)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
