---
story: ./story.md
status: done
layer: adapter
model: sonnet
files:
  - packages/domain/src/entities/mfa-factor.type.ts
  - packages/domain/src/entities/index.ts
  - packages/domain/src/repositories/mfa-repository.port.ts
  - packages/domain/src/repositories/index.ts
  - packages/domain/src/repositories/repositories.ts
  - packages/domain/src/services/mfa/enroll-totp.usecase.ts
  - packages/domain/src/services/mfa/verify-factor.usecase.ts
  - packages/domain/src/services/mfa/unenroll-factor.usecase.ts
  - packages/domain/src/services/mfa/dtos.ts
  - packages/domain/src/services/mfa/index.ts
  - packages/domain/src/services/index.ts
  - packages/domain/__tests__/services/mfa/enroll-totp.test.ts
  - packages/domain/__tests__/services/mfa/verify-factor.test.ts
  - packages/domain/__tests__/services/mfa/unenroll-factor.test.ts
  - packages/repositories/supabase/src/mfa.repository.ts
  - packages/repositories/supabase/src/index.ts
  - packages/shell-runtime/src/resources/mfa.ts
  - packages/shell-runtime/src/client.ts
  - apps/web/src/lib/repositories-factory.ts
  - apps/server/src/lib/repositories.ts
  - apps/web/src/lib/i18n/locales/en/user-profile.json
validation:
  kind: domain-test
  specs:
    - packages/domain/__tests__/services/mfa/enroll-totp.test.ts
    - packages/domain/__tests__/services/mfa/verify-factor.test.ts
    - packages/domain/__tests__/services/mfa/unenroll-factor.test.ts
---

# Wire MFA spine

Introduce the new `IMfaRepository` port + Supabase adapter + runtime resource + factory wiring + i18n keys for the MFA enrollment surface. No UI change in this task.

## Done when

- [ ] `MfaFactor` entity (id, friendlyName, factorType: 'totp', status: 'unverified' | 'verified', createdAt) and `EnrollTotpOutput` (id + totp.{qrCode, secret, uri}) declared in `packages/domain/src/entities`.
- [ ] `IMfaRepository` port with: `listFactors()`, `enrollTotp(friendlyName)`, `challenge(factorId)`, `verify({factorId, challengeId, code})`, `unenroll(factorId)`. `Repositories` type extended with `mfa: IMfaRepository`.
- [ ] Three domain services with Zod-validated inputs: `EnrollTotpService`, `VerifyMfaFactorService` (chains challenge + verify; throws `InvalidProfileInputException` on missing fields), `UnenrollFactorService`.
- [ ] `SupabaseMfaRepository` implements all five port methods by delegating to `client.auth.mfa.*` and mapping responses to entities.
- [ ] `shell.mfa.*` runtime resource exposes the same surface; `listFactors` uses query key `['mfa-factors', userId]` with an `invalidate.factors` helper.
- [ ] Factories wired: `apps/web/src/lib/repositories-factory.ts` constructs `SupabaseMfaRepository` from the browser client; `apps/server/src/lib/repositories.ts` does the same.
- [ ] i18n keys added under `userProfile.mfa.*`: `enabled`, `enrollError`, `verifyError`, `unenrollConfirm`, `unenrollRemoved`, `dialog.{nameTitle,nameLabel,nameHint,qrTitle,qrHint,manualSecret,otpTitle,otpDescription,verifying,enable,cancel}`.
- [ ] At least 6 domain tests covering: enroll happy path, verify happy path, verify wrong-code surfaces, unenroll happy path, empty/invalid friendlyName, malformed factorId.
- [ ] `pnpm --filter @guepard/domain test` + `pnpm typecheck` monorepo-wide pass.

## Notes

- Supabase `auth.mfa.unenroll(factorId)` does not require re-auth at the API level; the re-auth gate is enforced in the section consumer (task 003) by calling `signInWithPassword` first. Document this in the port's JSDoc.
- Session refresh after verify is handled in the runtime resource (`client.auth.refreshSession()` after `verify` resolves) so all callers benefit.
- Spec anchors: [§4.1 SD-3](../../../specs/0025-user-profile-phase1.md#41-layered-sequence-diagrams), [§7.1 Domain](../../../specs/0025-user-profile-phase1.md#71-domain-packagesdomain), [§9 security checklist](../../../specs/0025-user-profile-phase1.md#9-security-checklist).
