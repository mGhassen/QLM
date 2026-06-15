# RFC 0020 — Admin console architecture

| Field      | Value                                                                       |
| ---------- | --------------------------------------------------------------------------- |
| Status     | Draft (stub)                                                                |
| Author     | Hani Chalouati                                                              |
| Created    | 2026-04-14                                                                  |
| Target     | Phase 1 — internal `/admin` area for support operations (replace Supabase Studio for auth) |
| Supersedes | —                                                                           |
| Related    | 0012, 0013, 0016, 0018, 0021                                                |

## 1. Summary

Ship an in-app `/admin` area that exposes Better Auth's `admin` plugin + DB ops for the support team. Replaces the auth-related use of Supabase Studio (table editor, user management) for the on-prem deployment where Studio isn't shipped.

Phase 1 ships:

- `/admin` route group in `apps/web`, guarded by super-admin role + AAL2 (RFC 0013).
- Users screen: search by email, view profile, resend verification, reset password, revoke sessions, ban/unban, view MFA factors, disable MFA.
- Organizations screen: list, view members, change roles, remove members.
- Invitations screen: list pending, resend, revoke.
- Audit log screen (consumer of RFC 0016): filter by user / event / date range.
- IP allowlist enforcement (via ALB or Cloudflare) in production; documented for on-prem customers.
- Every admin mutation writes an audit event (RFC 0016) **before** the mutation.

Phase 2 adds impersonation (RFC 0021 — separate RFC due to risk profile).

## 2. Motivation

Leaving Supabase means losing Studio's user management UI. Support still needs a way to reset user passwords, unban accounts, inspect MFA state, and view audit trails without direct DB access. On-prem customers need this too.

Building it in-app (vs third-party admin frameworks) gives us: consistent UX, same auth stack, no extra container, full control over permissions.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- Route group at `/admin`; 404 for non-super-admins, redirect for unauthenticated.
- All actions listed in §1.
- Every action audited pre-mutation (write fails → mutation doesn't execute).
- IP allowlist enforced in prod; local dev bypassed via config.
- UI uses existing Shadcn primitives + TanStack Router; feels like the rest of the app.
- Pen test (RFC 0031) covers `/admin` surface.

### 3.2 Non-goals (phase 1)

- **Impersonation.** RFC 0021 — separate because it's the single highest-risk feature.
- **General DB browser / SQL editor.** Use DBeaver/TablePlus off-band.
- **Customer-facing admin** (org-admin UI for org members). Orthogonal; part of the product, not this RFC.
- **Configuration editor** (feature flags, system config). Phase 2.

## 4. Prior art in the codebase

- **Reused**: Shadcn UI, TanStack Router, `useShell()`, existing `is_super_admin()` SQL helper.
- **Replaced**: manual SQL for support ops.
- **Orthogonal**: org-level member management (lives in the main product, not admin console).

## 5. Conceptual model

Two privilege tiers:

- **Super admin** — platform-level, accesses `/admin`, manages any user/org.
- **Org owner/admin** — customer-level, manages their own org via the main product UI.

Never conflated.

## 6. Interface contract

```
/admin                  → dashboard (counts, recent audit events)
/admin/users            → list + search
/admin/users/$id        → detail + actions
/admin/orgs             → list
/admin/orgs/$id         → detail + members
/admin/invitations      → pending invitations
/admin/audit-log        → filtered event viewer
```

## 7. Security and trust boundaries

- Super-admin role granted via DB (no self-service promotion).
- Every route requires: authenticated + super-admin + AAL2 + IP allowlisted.
- Every mutation: pre-write audit event; if audit write fails, mutation aborts.
- Destructive actions (ban, revoke all, remove member) require confirmation dialog with typed confirmation ("type USER_EMAIL to confirm").
- `/admin` excluded from search engines via `noindex` meta.

## 8. Rollout plan

| Phase | Scope                                 | Artifacts               | Status |
| ----- | ------------------------------------- | ----------------------- | ------ |
| 1     | Users, orgs, invitations, audit log   | This RFC + phase-1 spec | Draft  |
| 2     | Impersonation                          | RFC 0021                | Draft  |
| 3     | Feature flags / config editor          | Phase 3 RFC             | Future |

## 9. Open questions

1. **Route placement.** Separate `/admin` app or merged into main shell? Proposal: separate route group in the same app — reuse shell but clearly delineated.
2. **Break-glass admin for emergencies** (when all super-admins are locked out). Proposal: CLI script runnable from bastion only, with audit.
3. **Org-admin "god mode" scope.** Should a super-admin see billing data, notebooks, datasources? Proposal: read-only everywhere, write only for auth/identity ops.
4. **Localization.** Admin UI i18n or English-only? Proposal: English-only — internal tool.

## 10. Alternatives considered

- **React-Admin / AdminJS.** Rejected — generic look; extra dependency; doesn't integrate with `useShell()`.
- **CLI-only admin.** Rejected — support team needs a UI; CLI is break-glass only.
- **Supabase Studio for on-prem.** Rejected — we're removing Supabase.

## 11. References

- [Better Auth admin plugin](https://better-auth.com/docs/plugins/admin)
- [RFC 0016 — Audit log](./0016-auth-audit-log.md)
- [RFC 0021 — Impersonation](./0021-auth-impersonation.md)
