# RFC 0014 — Organization plugin integration

| Field      | Value                                                                      |
| ---------- | -------------------------------------------------------------------------- |
| Status     | Draft (stub)                                                               |
| Author     | Hani Chalouati                                                             |
| Created    | 2026-04-14                                                                 |
| Target     | Phase 1 — align current org schema with Better Auth's organization plugin |
| Supersedes | —                                                                          |
| Related    | 0012, 0015, 0020                                                           |

## 1. Summary

Integrate Better Auth's `organization` plugin with the existing `organizations`, `organization_memberships`, `invitations`, and role/permission schemas. The plugin shape is close to what already exists — this RFC resolves the delta (field names, role model, invitation token format) without forcing a full schema rewrite.

Phase 1 ships:

- `organization` plugin enabled on Better Auth with a custom schema mapping to existing tables.
- Invitation flow reusing `invitations` table + existing email-token pattern; `create_invitation` RPC replaced by a server route that writes the invitation + sends the email.
- Role model: existing `account_role` enum preserved; plugin configured with custom `memberRole` mapping.
- `has_role_on_organization()` and `has_permission()` SQL helpers unchanged — continue to back 91 RLS policies.
- Hooks for invite, accept, list members, change role, remove member — behind existing hook facades.

## 2. Motivation

Better Auth's org plugin gives typed APIs for common operations but assumes its own table layout. The console's org/membership/invitation model predates it and is denser (role hierarchy, permission rows, account_role enum). Forcing the plugin's default schema would break RLS across 40+ files.

Better Auth supports **schema customization** — point the plugin at existing tables. That is the cheapest correct path.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- Plugin enabled and talking to existing `organizations` / `organization_memberships` / `invitations` tables.
- Create org, invite member, accept invitation, list members, change role, remove member all flow through plugin APIs without schema churn.
- `has_role_on_organization` and `has_permission` continue to pass their existing pgTAP tests.
- Invitation emails sent via SES with the existing `invite_token` format (so links in flight during cutover still work).

### 3.2 Non-goals (phase 1)

- **Teams / nested orgs.** Not currently used; plugin supports but we skip.
- **Org-level SSO.** Phase 3 (some enterprise customers will want this).
- **Per-org MFA policy.** RFC 0013 phase 2.

## 4. Prior art in the codebase

- **Reused**: `apps/web/supabase/schemas/06-organizations.sql`, `08-memberships.sql`, `09-invitations.sql`, `03-roles.sql`; `has_role_on_organization`, `has_permission`, `is_account_owner`.
- **Replaced**: `create_invitation` RPC → Hono route wrapping plugin + email send.
- **Orthogonal**: billing customer linkage (stays as-is).

## 5. Conceptual model

Better Auth's org primitives: `organization`, `member`, `invitation`. Mapping:

| Plugin entity | Existing table                     | Notes                                     |
| ------------- | ---------------------------------- | ----------------------------------------- |
| organization  | `organizations`                    | 1:1                                       |
| member        | `organization_memberships`         | Plugin's `role` maps to `account_role`    |
| invitation    | `invitations`                      | Reuse `invite_token` field as plugin id  |

## 6. Interface contract

Hooks keep names: `useCreateOrganization`, `useInviteMember`, `useAcceptInvitation`, `useListMembers`, `useChangeMemberRole`, `useRemoveMember`, `useLeaveOrganization`.

## 7. Security and trust boundaries

- Invitation tokens: 256-bit random, single-use, 7-day TTL (existing behavior).
- Accepting an invitation requires an authenticated user whose email matches (or is verified to match) the invited address.
- Role changes require AAL2 for `owner` → any, and for grants to `owner`.

## 8. Rollout plan

| Phase | Scope                           | Artifacts               | Status |
| ----- | ------------------------------- | ----------------------- | ------ |
| 1     | Plugin + schema mapping + hooks | This RFC + phase-1 spec | Draft  |
| 2     | Org-level SSO                    | Phase 2 RFC             | Future |

## 9. Open questions

1. **Plugin role mapping.** Better Auth expects free-form role strings; we have an enum. Proposal: cast enum ↔ string at the adapter boundary.
2. **Invitation email rendering.** Move existing template to React Email / MJML, or inline. Proposal: React Email — versionable and reviewable.
3. **Multi-tenant edge cases** (user in many orgs, default org selection). Proposal: keep existing `currentOrgSlug` in user metadata; plugin doesn't dictate.
4. **Plugin migrations.** Does enabling the plugin create new columns we don't want? Proposal: run `better-auth migrate --dry-run` in phase 1, reconcile before any DDL.

## 10. Alternatives considered

- **Skip the plugin; keep bespoke org handling.** Rejected — loses typed APIs, reinvents invitation lifecycle.
- **Rewrite schema to plugin defaults.** Rejected — massive RLS/FK churn for no functional gain.

## 11. References

- [Better Auth organization plugin](https://better-auth.com/docs/plugins/organization)
- Existing: `apps/web/supabase/schemas/06..09-*.sql`
