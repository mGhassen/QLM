# RFC 0021 — Impersonation flow

| Field      | Value                                                                     |
| ---------- | ------------------------------------------------------------------------- |
| Status     | Draft (stub)                                                              |
| Author     | Hani Chalouati                                                            |
| Created    | 2026-04-14                                                                |
| Target     | Phase 2 of admin console — time-boxed, audited impersonation for support  |
| Supersedes | —                                                                         |
| Related    | 0013, 0016, 0020                                                          |

## 1. Summary

Allow super-admins to impersonate an end-user for support purposes. Isolated from RFC 0020 because impersonation is the single highest-risk feature in the admin console — it grants effective identity theft and must be designed with maximum oversight.

Phase 1 ships:

- Impersonation requires: super-admin role, AAL2 session, **written justification** (≥20 chars, stored in audit log), explicit confirmation modal.
- Max duration: **30 minutes**; token auto-expires, cannot be refreshed, must re-request with new justification.
- Visual indicator: persistent red banner at top of app showing "Impersonating <email> — 29:12 remaining — End now".
- The impersonated user receives an email notification ("A platform admin signed in as you to assist with a support request. Reason: <justification>") — cannot be silenced.
- Audit events: `impersonation.start`, `impersonation.end` (normal exit and expiry), both with justification, admin id, target user id, request/session IDs, IP, UA.
- Post-impersonation: original admin session is restored; a summary shown of actions taken while impersonating.
- Forbidden actions while impersonating: changing password, changing email, disabling MFA, changing role, transferring ownership. Enforced server-side.

## 2. Motivation

Impersonation is enormously useful for support — "I can't reproduce this" is usually a permission or data-scope issue visible only from inside the user's session. But it's also the feature that most frequently causes SOC 2 findings and lawsuit exposure if misused.

Design principle: **cannot happen silently, cannot persist, cannot do irreversible damage**.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- Feature gated by role + AAL2 + justification + confirmation.
- Time-boxed; no extension mechanism.
- Notification to impersonated user — no opt-out.
- Audit log pre-mutation (if audit write fails, impersonation doesn't start).
- Forbidden-action list enforced at the server, not just hidden in UI.
- Pen test covers the feature explicitly.
- Documented in support team runbook.

### 3.2 Non-goals (phase 1)

- **User opt-in/opt-out of impersonation.** Phase 2 — some customers will want this as a contractual feature.
- **Impersonation with elevated org-admin privileges** on the target's behalf. Phase 2.
- **Read-only impersonation mode** (see but not act). Phase 2 if signal demands.

## 4. Prior art in the codebase

- **Reused**: RFC 0016 audit log, RFC 0020 admin console shell, RFC 0018 session hardening (revocation pattern), RFC 0013 AAL2.
- **Replaced**: none — this is new.
- **Orthogonal**: org-admin "view as member" (doesn't grant identity — this RFC is about platform-admin only).

## 5. Conceptual model

Impersonation is modeled as a **new session** with:

- Principal: the target user (for authorization purposes — RLS evaluates as them).
- Actor claim: the admin's user id (for audit attribution).
- TTL: 30 min absolute, no refresh.
- `is_impersonation: true` claim (exposed via `is_impersonating()` SQL helper).

Not modeled as a modification of the admin's session — that would mix responsibilities and make forbidden actions harder to enforce.

## 6. Interface contract

```
POST /admin/impersonate { target_user_id, justification }
  → { token, expires_at }
DELETE /admin/impersonate
  → { summary: { actions_taken, duration } }
```

Route guards check `is_impersonation` claim and refuse forbidden actions.

## 7. Security and trust boundaries

- Only super-admin + AAL2 can POST to `/admin/impersonate`.
- Impersonation session cannot itself start a nested impersonation.
- Admin actions inside admin console are disabled while impersonating (you're "the user" for the window).
- On impersonation end, admin's original session is restored; no new login needed.
- Email notification to target user is fire-and-forget (async), but audit event is synchronous — notification failure does not roll back.

## 8. Rollout plan

| Phase | Scope                                 | Artifacts               | Status |
| ----- | ------------------------------------- | ----------------------- | ------ |
| 1     | Basic impersonation + audit + notification + forbidden list | This RFC + phase-1 spec | Draft  |
| 2     | User opt-in, read-only mode           | Phase 2 RFC             | Future |

## 9. Open questions

1. **User opt-in.** Contract-level feature for some customers? Proposal: phase 2; phase 1 is always-on for super-admins.
2. **Duration.** 30 min vs 15 min. Proposal: 30 min — longer supports complex debugging, not hostile since fully audited.
3. **Surface of forbidden actions.** Is the list correct and complete? Proposal: review with security team before finalization; err on the side of forbidding more.
4. **Notification delivery.** If email is down, delay the feature or proceed? Proposal: proceed with audit only; never block support on mail infra.
5. **Should we even ship this in v1?** Alternative: teach support to walk users through password resets. Proposal: ship it — support load without it will be unbearable; the risk is manageable with controls.

## 10. Alternatives considered

- **No impersonation, ever.** Rejected — real-world support demands drive it; risk controllable with design.
- **Shared "support" account that users grant to.** Rejected — doesn't match the threat model; still needs identity claim in audit.
- **Impersonation tokens issued by target user (with consent).** Phase 2 — best UX but doesn't cover incident response.

## 11. References

- [Better Auth admin `impersonate` API](https://better-auth.com/docs/plugins/admin)
- SOC 2 CC6.3 (logical access), CC6.1 (elevated access oversight)
- ISO 27001:2022 A.5.18 (access control)
