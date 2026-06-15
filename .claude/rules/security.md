# Security & Compliance

Every RFC, spec, story, and task must respect these rules. **Compliance evidence (threat models, vendor assessments, control matrix, policies, audit reports) lives in Vanta** — not in this repo. This file captures only the engineering-time rules that shape design and code.

## Frameworks in scope

- **SOC 2** (Trust Services Criteria: Security, Availability, Confidentiality) — primary.
- **ISO 27001:2022** (Annex A controls) — secondary, mostly overlapping.

When an RFC/spec mentions a control, cite the SOC 2 CC code and/or ISO Annex A reference (e.g. `CC6.1`, `A.8.24`) in the relevant section. Do not paste SOC 2/ISO control text into the repo — link to Vanta.

## Non-negotiable design rules

### Identity, authz, sessions

- **RLS is always on** for every table holding user-owned or tenant-owned data. No `USING (true)` fallback policies.
- **Fail-closed authorization.** If session context is missing/invalid, deny. Never default to "anonymous can read."
- **Session tokens hashed at rest.** Plaintext tokens only in cookies.
- **MFA mandatory for super-admin and platform-privileged roles.** No opt-out.
- **Sensitive actions require AAL2** — password change, MFA disable, role elevation, impersonation.

### Secrets & keys

- **Never commit secrets.** Not in `.env.local`, not in tests, not in stack traces, not in logs. `.env*` files are gitignored; treat them as local-only.
- **Secrets live in a managed store** — AWS Secrets Manager in prod; on-prem customers configure their own (Vault, sealed-secrets, env-from-file). Access the `SecretProvider` abstraction, never read env directly for auth-critical secrets.
- **No static AWS keys in CI.** Use GitHub OIDC → AWS IAM.
- **Rotation cadence documented per secret.** Annual for long-lived, 90 days for SES/DB.

### Cryptography

- **Passwords: argon2id.** Verifying legacy bcrypt with on-login rehash is acceptable during migration windows.
- **Session / JWT signing: HS256 minimum with ≥256-bit secret**, or RS256 where JWT consumers are external.
- **Random tokens: ≥128 bits from CSPRNG.** Never `Math.random()`.
- **TLS 1.2+ everywhere**, including app ↔ RDS (`sslmode=verify-full`).
- **KMS-encrypted storage at rest** — RDS + S3. Customer-managed keys (CMK) where the customer demands it.

### Input & output hygiene

- **Zod-validate every boundary input** (HTTP request bodies, query params, webhook payloads).
- **Parameterized queries only.** No string concatenation into SQL. Use Kysely / Drizzle / the Supabase query builder.
- **No PII in logs.** Pino redact on `password`, `token`, `authorization`, `cookie`, `otp`, `secret`, `api_key`. Emails may be logged for auth events; passwords never.
- **Generic auth errors.** Never reveal whether an account exists — "Invalid credentials" for both unknown email and wrong password.
- **CSP + HSTS + secure cookie flags** on every response from the web app.

### Rate limiting & abuse

- **Rate limit every auth endpoint** (login, reset, OTP send/verify, OAuth callback). Per-IP and per-account.
- **Soft lockout** with exponential backoff. Never permanent auto-lock (DoS vector).
- **HIBP k-anonymity check** on signup and password change. Reject breached passwords.

### Audit & observability

- **Every security-relevant action is audited** — sign-in (success/fail), password change, MFA change, role change, session revoke, admin action, impersonation. Audit writes happen **before** the mutation; if audit fails, the mutation fails.
- **Audit log is append-only** (no `UPDATE`/`DELETE` grants) and tamper-evident (hash chain).
- **CloudWatch retention ≥ 1 year** for auth logs; archive older to Glacier for up to 7 years.

### Least privilege

- **Three DB roles minimum**: `app_user` (RLS subject, no BYPASSRLS), `app_admin` (BYPASSRLS, admin routes only), `app_migrate` (DDL, CI only). Service role is never used for user-facing requests.
- **IAM policies scoped per-secret** — no wildcard `secretsmanager:GetSecretValue`.
- **Super-admin access gated** by role + AAL2 + IP allowlist (prod).

### Data lifecycle

- **Soft delete → hard delete after 90 days** for users.
- **GDPR erasure** within 30 days of request. Audit log entries keep subject IDs but redact email to a hash.
- **Document retention** for any new table holding PII at design time.

## What RFC / spec / story authors must do

When the change touches auth, identity, session, secrets, or data lifecycle:

1. **Name the controls** affected (SOC 2 CC code, ISO Annex A). One line is enough — Vanta holds the full control text.
2. **State the threat** the change mitigates or introduces (one STRIDE bullet).
3. **Call out new audit events** — which events emit, with what payload shape.
4. **Call out new secrets** — what goes to Secrets Manager, rotation cadence.
5. **Call out data retention** — any new PII column or table needs a retention entry.

If a change obviously cannot touch any of the above (pure UI style, copy change, refactor inside a pure function), skip the section — but default to including it when in doubt.

## What RFC / spec / story authors must NOT do

- **Do not write threat models, vendor assessments, or control matrices into the repo.** Those live in Vanta.
- **Do not paste compliance framework text** (SOC 2 criteria language, ISO Annex A descriptions) into RFCs. Cite the code and link to Vanta.
- **Do not claim a control is "implemented"** in an RFC — RFCs are design. Implementation evidence goes in Vanta once the code ships and operates.

## Hard gates

- **Pen test required** before any production cutover affecting the auth surface. Zero Critical/High in auth scope. Scope and vendor tracked in Vanta.
- **CI security checks required** on main-branch merges: SAST (Semgrep or CodeQL), SBOM (CycloneDX), dependency audit (`pnpm audit --audit-level=high`). Failures block merge.
- **Signed commits** on `main`; branch protection enforced.

## External references

- Compliance evidence and policies: **Vanta** (internal link — ask Security owner).
- OWASP ASVS v4 for detailed verification requirements.
- OWASP Cheat Sheet Series for implementation patterns.
- NIST SP 800-63B for identity/authentication guidance.

Do not duplicate external reference content into this repo.
