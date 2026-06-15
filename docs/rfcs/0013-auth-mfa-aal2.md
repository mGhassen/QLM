# RFC 0013 — MFA and AAL2 emulation

| Field      | Value                                                                   |
| ---------- | ----------------------------------------------------------------------- |
| Status     | Draft (stub)                                                            |
| Author     | Hani Chalouati                                                          |
| Created    | 2026-04-14                                                              |
| Target     | Phase 1 — TOTP MFA + AAL2 session claim for sensitive actions           |
| Supersedes | —                                                                       |
| Related    | 0012 (Better Auth), 0020 (admin console), 0021 (impersonation)          |

## 1. Summary

Enable TOTP-based MFA via Better Auth's `twoFactor` plugin and emulate Supabase's AAL2 concept as a boolean session claim. Preserve the existing server-side `is_aal2()` SQL helper so RLS policies that gate sensitive actions continue to work unchanged.

Phase 1 ships:

- Better Auth `twoFactor` plugin enabled; TOTP enrollment + verification flow via the existing `useFetchMfaFactors` / MFA setup dialog (facade preserved).
- Session claim `aal: 'aal1' | 'aal2'` set by Better Auth after TOTP challenge.
- `public.is_aal2()` reimplemented reading from `app.jwt.claims`; existing policies keep compiling.
- Mandatory MFA enforcement for `super_admin` role (no opt-out).
- Recovery codes on enrollment (8 codes, single-use, stored hashed).

Later phases add WebAuthn (phishing-resistant factor) and SMS (not planned — deprecated by NIST).

## 2. Motivation

Several existing RLS policies and server checks gate super-admin and sensitive flows behind `is_aal2()`. Better Auth has no native AAL concept — it's just "2FA verified or not." We bridge with a session claim.

MFA for super-admins is a SOC 2 CC6.6 / ISO A.8.5 requirement for privileged access. Not optional.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- Users can enroll TOTP and get QR code + recovery codes.
- Sign-in flow challenges TOTP when the user has a factor; session upgrades to AAL2 on success.
- `is_aal2()` returns true only when the current session has `aal = 'aal2'`.
- `super_admin` users cannot obtain a session without AAL2 (enforced in sign-in handler and double-checked in middleware).
- Recovery codes can be consumed once to step up without the TOTP device.
- Existing 91 RLS policies and `check_requires_mfa` checks continue to work without rewriting.

### 3.2 Non-goals (phase 1)

- **WebAuthn / passkeys.** Phase 2. Phishing-resistant factor preferred long-term.
- **SMS MFA.** Never — NIST SP 800-63B deprecates it.
- **Per-organization MFA policy.** Phase 2 (some customers will require it).
- **Adaptive MFA (risk-based step-up).** Phase 3.

## 4. Prior art in the codebase

- **Reused**: `use-fetch-mfa-factors.ts`, MFA setup dialog, `check-requires-mfa.ts` server-side check, `is_aal2()` SQL helper, `is_mfa_compliant()` helper.
- **Replaced**: Supabase `client.auth.mfa.*` calls — swapped to Better Auth twoFactor plugin.
- **Orthogonal**: account linking (direct-to-spec).

## 5. Conceptual model

**Assurance level** is a property of the session, not the user. A user may have a TOTP factor enrolled but be in an AAL1 session (just signed in with password) or AAL2 (completed TOTP challenge this session).

`is_aal2()` reads the current session's claim. The claim is set by Better Auth after successful TOTP verification. The middleware (RFC 0011) propagates it to the GUC.

## 6. Interface contract

```ts
useEnrollTotp() → { mutate, secret, qrCodeUrl, recoveryCodes }
useVerifyTotp() → { mutate, isPending }  // upgrades session to AAL2
useDisableMfa() → { mutate } // requires current AAL2 session
```

SQL:

```sql
CREATE OR REPLACE FUNCTION public.is_aal2() RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT current_setting('app.jwt.claims', true)::jsonb->>'aal' = 'aal2';
$$;
```

## 7. Security and trust boundaries

- TOTP secret: 160-bit, stored encrypted at rest using pgsodium or app-level KMS.
- Recovery codes: stored as argon2id hashes; deleted on consumption.
- AAL2 session expiry: **30 minutes of inactivity** before downgrade to AAL1 (forces re-challenge for sensitive actions).
- Super-admin accounts with no MFA cannot sign in — enforced at login handler; a bootstrap super-admin seed flow exists for new deployments.
- MFA disable requires current AAL2 session + email confirmation.

## 8. Rollout plan

| Phase | Scope                                           | Artifacts               | Status |
| ----- | ----------------------------------------------- | ----------------------- | ------ |
| 1     | TOTP + recovery codes + AAL2 claim + is_aal2()  | This RFC + phase-1 spec | Draft  |
| 2     | WebAuthn / passkeys                              | Phase 2 RFC             | Future |
| 3     | Per-org MFA policy                               | Phase 3 RFC             | Future |

## 9. Open questions

1. **AAL2 session duration.** Full session lifetime or step-up-per-action? Proposal: step-up with 30-min idle window — balances UX and security.
2. **Recovery code count.** 8, 10, 16? Proposal: 10 (OWASP ASVS guidance).
3. **TOTP secret encryption.** pgsodium in-DB vs app-layer with KMS? Proposal: app-layer with AWS KMS — portable to on-prem customers with any KMS.
4. **Forced MFA for all users eventually?** Product decision deferred; phase 1 only forces it for super-admins.

## 10. Alternatives considered

- **No AAL concept; use "mfa_verified" boolean claim.** Rejected — loses graduated assurance levels, complicates future per-org policies.
- **WebAuthn first, TOTP later.** Rejected — TOTP ships faster, works without user hardware, covers SOC 2 bar today.

## 11. References

- [NIST SP 800-63B §5.1.5](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP ASVS v4 — V2 Authentication](https://owasp.org/www-project-application-security-verification-standard/)
- [RFC 0012 — Better Auth adoption](./0012-auth-better-auth-adoption.md)
