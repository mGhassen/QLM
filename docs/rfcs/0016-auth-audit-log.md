# RFC 0016 — Audit log architecture

| Field      | Value                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Status     | Draft (stub)                                                           |
| Author     | Hani Chalouati                                                         |
| Created    | 2026-04-14                                                             |
| Target     | Phase 1 — immutable audit log for auth and admin events (SOC 2 CC7.2) |
| Supersedes | —                                                                      |
| Related    | 0017, 0018, 0020, 0021                                                 |

## 1. Summary

Introduce `auth_audit_log` — an append-only table that records every security-relevant event: sign-in (success/failure), password change, MFA change, role change, session revocation, admin action, impersonation start/end. Shipped to CloudWatch Logs with ≥1 year retention. Independent of the Supabase → Better Auth migration: **can ship today on the current stack**.

Phase 1 ships:

- `auth_audit_log` table with hash-chain column (each row's hash includes previous row's hash — tamper-evident).
- Append-only enforcement via revoked `UPDATE`/`DELETE` privilege + trigger preventing same.
- Emitter module called from Hono middleware and Better Auth hooks. All call sites typed via a discriminated union of event types.
- CloudWatch Logs shipper via subscription filter or per-event fire-and-forget write.
- Admin console v2 (RFC 0020) surfaces the log.
- Retention policy: 1y online, 7y archived to S3 Glacier for SOC 2 trust services.

## 2. Motivation

Audit logging is a **control, not a feature**. Without it: every other auth control becomes un-auditable. SOC 2 CC7.2/CC7.3 and ISO A.8.15 mandate it. Designing it now, decoupled from the migration, means the migration itself generates audit events from day one.

The hash chain is defense against the most common audit-log attack: an attacker with DB write access who edits history.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- Table schema with fields: `id`, `ts`, `actor_user_id`, `subject_user_id`, `event_type`, `event_data` (jsonb), `ip`, `user_agent`, `correlation_id`, `row_hash`, `prev_row_hash`.
- Immutability: `app_user` and `app_admin` roles have INSERT only; no UPDATE, no DELETE.
- Hash-chain trigger computes `row_hash = sha256(id || ts || actor_user_id || subject_user_id || event_type || event_data || prev_row_hash)`.
- Typed emitter with an exhaustive `AuthAuditEvent` union — new events force a switch-case update.
- Shipped to CloudWatch with 1-year retention; archived to S3 Glacier after 1 year, 7-year total retention.
- Admin console surfaces filtered view (by user, event type, date range).

### 3.2 Non-goals (phase 1)

- **Application-level audit** (non-auth events like "user renamed a notebook"). Separate concern, separate table.
- **SIEM integration.** Phase 2 — most customers will want to ship logs to their own Splunk/Datadog.
- **Real-time alerting on patterns** (e.g. 10 failed logins → alert). RFC 0017 overlaps.

## 4. Prior art in the codebase

- **Reused**: Pino logger setup (for dev-time echo), Hono middleware insertion point.
- **Replaced**: scattered `logger.info('user signed in')` calls that aren't structured — these become typed audit events.
- **Orthogonal**: telemetry / OTel (separate pipeline for performance data).

## 5. Conceptual model

Every security-relevant state transition produces an audit event. Events are:

- **Immutable**: no updates, no deletes (enforced at DB + app).
- **Attributable**: every event names its actor (who) and subject (on whom).
- **Traceable**: `correlation_id` links events within a single request or flow.
- **Tamper-evident**: hash chain makes undetected tampering require rewriting all subsequent rows.

## 6. Event taxonomy (initial)

`sign_in.success`, `sign_in.failure`, `sign_out`, `password.change`, `password.reset.request`, `password.reset.complete`, `mfa.enroll`, `mfa.verify`, `mfa.disable`, `session.revoke`, `role.change`, `org.invite`, `org.accept`, `org.remove_member`, `admin.action`, `impersonation.start`, `impersonation.end`.

Each event type has a typed payload schema (Zod). Adding an event requires updating the union + adding a schema.

## 7. Security and trust boundaries

- Write path: application-only; DB roles have no direct INSERT except via `audit_emit()` SECURITY DEFINER function that enforces schema.
- Read path: super-admin only, AAL2, IP allowlisted (corp VPN).
- PII in `event_data`: email is recorded; passwords, secrets, tokens **never**.
- Hash-chain break is alertable — a nightly verifier job recomputes the chain tail and fires PagerDuty on mismatch.

## 8. Rollout plan

| Phase | Scope                                              | Artifacts               | Status |
| ----- | -------------------------------------------------- | ----------------------- | ------ |
| 1     | Table + trigger + emitter + CloudWatch + admin view | This RFC + phase-1 spec | Draft  |
| 2     | Customer-configurable SIEM export                   | Phase 2 RFC             | Future |

## 9. Open questions

1. **Hash algorithm.** SHA-256 (fast, ubiquitous) vs blake3 (faster). Proposal: SHA-256 — standards-friendly.
2. **Synchronous vs async emit.** Block the request on audit write? Proposal: synchronous in phase 1; async queue only if measured as a bottleneck (simpler to audit durability story synchronously).
3. **Retention in DB vs Glacier.** Longer DB retention (3y?) vs archive sooner. Proposal: 1y DB, 6y Glacier — balances query speed and storage cost.
4. **Duplicate events.** If a retry fires the same event twice, dedupe or accept? Proposal: accept — idempotency key in `event_data` for clients that need it.

## 10. Alternatives considered

- **CloudWatch-only (no DB table).** Rejected — loses transactional guarantees with the event, hurts admin UX.
- **Separate audit DB.** Deferred — premature; single-DB simpler for now.
- **Blockchain / append-only ledger tech.** Rejected — over-engineering; hash chain covers the threat model.

## 11. References

- NIST SP 800-92 (log management)
- SOC 2 CC7.2, CC7.3
- ISO 27001:2022 A.8.15
