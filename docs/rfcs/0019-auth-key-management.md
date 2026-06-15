# RFC 0019 — Key management

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Status     | Draft (stub)                                                          |
| Author     | Hani Chalouati                                                        |
| Created    | 2026-04-14                                                            |
| Target     | Phase 1 — secret storage, rotation, and custody for auth-critical keys |
| Supersedes | —                                                                     |
| Related    | 0012, 0015, 0018, 0020, 0021, 0028                                    |

## 1. Summary

Codify key management for auth: the Better Auth `secret`, JWT signing key, MFA TOTP encryption key, password-reset/OTP signing key, SES credentials. Store in AWS Secrets Manager (QLM-managed), document custody, and define rotation cadence. Independent of the migration — ships against the current stack too.

Phase 1 ships:

- Inventory of every auth-critical secret + owner + rotation cadence.
- All secrets stored in AWS Secrets Manager (KMS CMK, customer-managed).
- IAM policy: only ECS task role and CI OIDC role can read; individual engineers cannot read in prod.
- Rotation: annual for long-lived, 90 days for SES SMTP, immediately on personnel departure or incident.
- CI uses GitHub OIDC → AWS IAM (no static AWS keys in CI).
- Break-glass: sealed envelope procedure for root secrets, quarterly tested.
- For on-prem: same pattern, customer-operated (Vault, sealed secrets, or customer AWS).

## 2. Motivation

Secrets in env files committed to repos is the #1 cause of auth compromise in startups. Supabase made this easy to get wrong (service role key in .env.local). A migration is a natural moment to lock down key handling.

Also required: SOC 2 CC6.1 + ISO A.8.24 both demand documented cryptographic key lifecycle.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- Complete secret inventory documented.
- 100% of auth-critical secrets in Secrets Manager, none in files or env committed to git.
- IAM least-privilege per secret; no wildcard `secretsmanager:GetSecretValue`.
- CI uses OIDC exclusively; no static AWS access keys in GitHub.
- Rotation runbook per secret; automated where possible (SES SMTP).
- Alerting on unusual `GetSecretValue` patterns via CloudTrail + EventBridge.
- For on-prem: packaging supports Vault, sealed-secrets (k8s), or env-from-file with documented restrictions.

### 3.2 Non-goals (phase 1)

- **HSM-backed keys.** Phase 2 — customer-demand-driven.
- **Automated rotation for long-lived app secrets.** Phase 2 — most don't support zero-downtime rotation natively.
- **Customer-managed encryption keys (BYOK) for data-at-rest.** Phase 3 (enterprise feature).

## 4. Prior art in the codebase

- **Reused**: AWS SDK already present for SES integration.
- **Replaced**: `.env.local` files for any auth-critical secret (move to Secrets Manager).
- **Orthogonal**: non-auth secrets (analytics keys, telemetry tokens) — same pattern, out of scope here.

## 5. Secret inventory (phase 1)

| Secret                             | Use                                   | Rotation | Owner     |
| ---------------------------------- | ------------------------------------- | -------- | --------- |
| Better Auth `secret`               | Session token signing                 | 1y       | Platform  |
| JWT signing key (HS256)            | If we issue JWTs for API consumers    | 1y       | Platform  |
| MFA TOTP encryption key            | Encrypt stored TOTP secrets           | 2y       | Platform  |
| OTP / reset-link signing HMAC      | Sign short-lived links                | 1y       | Platform  |
| SES SMTP credentials               | Email send                            | 90d      | Ops       |
| Database connection password       | RDS app user                          | 90d      | Ops       |
| Migration admin DB password        | CI `app_migrate` role                 | 90d      | Ops       |
| OAuth client secrets (18 providers) | OAuth flows                           | 1y       | Platform  |

## 6. Security and trust boundaries

- Production secrets readable only by: ECS task IAM role, CI OIDC role (short-lived), break-glass role (MFA + audit).
- Development uses separate AWS account + separate secret values.
- No secret is ever logged. Pino redacts `authorization`, `cookie`, `password`, `token`, `secret` keys.
- Rotation for session-signing keys requires dual-key support (accept old and new signatures during grace window).

## 7. Rollout plan

| Phase | Scope                                    | Artifacts               | Status |
| ----- | ---------------------------------------- | ----------------------- | ------ |
| 1     | Secrets Manager adoption + rotation runbook | This RFC + phase-1 spec | Draft  |
| 2     | Automated rotation (where safe)            | Phase 2 RFC             | Future |
| 3     | Customer BYOK                              | Phase 3 RFC             | Future |

## 8. Open questions

1. **Session-key rotation with dual-verify.** Better Auth supports it? Proposal: confirm in phase 0 spike; if not, build a small verifier plugin.
2. **On-prem abstraction layer.** Abstract reads through a `SecretProvider` interface (AWS Secrets Manager | Vault | file)? Proposal: yes — clean on-prem story.
3. **Rotation automation scope.** Which secrets can truly rotate without downtime? Proposal: only SES and DB passwords; rest require planned rotation.
4. **Audit trail for secret access.** CloudTrail only, or app-side too? Proposal: CloudTrail is canonical.

## 9. Alternatives considered

- **Kubernetes secrets only.** Rejected — plaintext at rest in etcd, worse audit story.
- **HashiCorp Vault everywhere.** Deferred — AWS Secrets Manager is sufficient for our threat model; Vault adds ops surface.
- **SOPS-encrypted files in repo.** Considered — works for non-prod; Secrets Manager wins for prod audit.

## 10. References

- NIST SP 800-57 (key management)
- SOC 2 CC6.1, ISO 27001:2022 A.8.24
- [AWS Secrets Manager best practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
