---
story: ./story.md
status: done
layer: domain
files:
  - packages/domain/src/usecases/dto/create-user-token.input.ts
  - packages/domain/src/usecases/dto/create-user-token.output.ts
  - packages/domain/src/usecases/dto/revoke-user-token.output.ts
  - packages/domain/src/usecases/dto/index.ts
  - packages/domain/src/usecases/index.ts
  - packages/domain/src/exceptions/token-not-found.exception.ts
  - packages/domain/src/exceptions/token-already-revoked.exception.ts
  - packages/domain/src/exceptions/token-expiration-invalid.exception.ts
  - packages/domain/src/exceptions/index.ts
---

# Add user-token DTOs and exceptions

## Purpose

Ship the input/output DTOs that the domain services in Story 004 will consume, plus the three domain exceptions those services raise. Also encodes the `expires_at` cap (≤ 365 days) at the type layer via Zod `.refine` so validation happens uniformly regardless of which caller creates a token.

## Files

- `packages/domain/src/usecases/dto/create-user-token.input.ts` — `CreateUserTokenInputSchema = z.object({ token_name: string().min(1).max(255), scopes: array(UserTokenScopeSchema).min(1), expires_at: number().int().positive() }).refine(({ expires_at }) => { const now = Math.floor(Date.now() / 1000); return expires_at > now && (expires_at - now) <= 365 * 86400; }, { message: 'expires_at must be in the future and within 365 days', path: ['expires_at'] })`. Export `CreateUserTokenInput = z.infer<typeof …>`.
- `packages/domain/src/usecases/dto/create-user-token.output.ts` — `CreateUserTokenOutputSchema = z.object({ row: UserTokenSchema, rawJwt: z.string().min(1) })`. Export `CreateUserTokenOutput`.
- `packages/domain/src/usecases/dto/revoke-user-token.output.ts` — `export const RevokeUserTokenOutputSchema = UserTokenSchema; export type RevokeUserTokenOutput = UserToken;`.
- `packages/domain/src/usecases/dto/index.ts` — re-export the three DTOs.
- `packages/domain/src/usecases/index.ts` — ensure the dto subpath is re-exported (update if necessary).
- `packages/domain/src/exceptions/token-not-found.exception.ts` — `export function tokenNotFoundException(tokenId: string) { return DomainException.new({ code: <pick-next-unused-code>, overrideMessage: \`Token ${tokenId} not found\`, data: { tokenId } }); }` (or matching factory pattern — follow the existing exception files in the same folder).
- `packages/domain/src/exceptions/token-already-revoked.exception.ts` — analogous.
- `packages/domain/src/exceptions/token-expiration-invalid.exception.ts` — analogous; raised when a caller passes `expires_at` that fails the refinement. Mostly defensive — Zod catches it first.
- `packages/domain/src/exceptions/index.ts` — re-export the three.

## Acceptance

- [ ] `CreateUserTokenInputSchema.parse({...})` rejects:
  - Empty / whitespace `token_name`.
  - Empty `scopes` array.
  - `scopes` containing an unknown value.
  - `expires_at` equal to or earlier than now.
  - `expires_at` more than 365 days in the future (boundary: `365*86400 + 1` seconds rejects).
- [ ] `CreateUserTokenInputSchema.parse({...})` accepts the two boundary cases within range: `expires_at = now + 1` and `expires_at = now + 365*86400`.
- [ ] `CreateUserTokenOutputSchema.parse({ row, rawJwt })` succeeds for a valid shape; rejects missing `rawJwt` or empty string.
- [ ] `RevokeUserTokenOutputSchema` is structurally identical to `UserTokenSchema`.
- [ ] Each of the three exception factories returns a `DomainException` with a distinct, non-overlapping `code` value (per the existing `CodeDescription` registry — find the next free slot in the codes enum; coordinate with the existing exception-code inventory).
- [ ] All three DTO types + all three exceptions are re-exported from their respective `index.ts` files.
- [ ] `pnpm --filter @qlm/domain typecheck` passes.
- [ ] No imports of `jsonwebtoken`, `@supabase/*`, or `react` inside any new file.

## Test plan

```
pnpm --filter @qlm/domain typecheck
# Runtime tests land in task 004 of this story.
```

## Storybook validation

N/A — not a UI task.

## Notes

- Pick the next three available exception codes from `packages/domain/src/common/code.ts` (or wherever the `CodeDescription` registry lives); reserve them in order, don't scatter. If the codebase uses a namespaced code convention (e.g. `TOKEN_NOT_FOUND`), follow it.
- `create-user-token.input.ts` must import `UserTokenScopeSchema` from `../../entities` (task 001 must be done first — hence blocked_by in task order).
- `create-user-token.output.ts` must import `UserTokenSchema` from `../../entities`.
