---
spec: docs/specs/0009-token-management-phase1.md
spec_sections:
  - "#71-domain-packagesdomain"
  - "#51-data-shapes"
  - "#5-api-contracts"
status: done
started: 2026-04-14
finished: 2026-04-15
blocks:
  - "004-implement-user-token-domain-services"
  - "007-build-shared-bearer-token-middleware"
  - "008-wire-http-adapter-and-react-query-hooks"
  - "009-build-user-tokens-primitives-and-row"
  - "011-build-tokens-settings-pane-and-inline-sub-flows"
blocked_by:
  - "001-scaffold-user-tokens-surface"
---

# Define user-token domain types

## Goal

Ship the domain entity, Zod schemas, input/output DTOs, repository + JWT-signer ports, and domain exceptions for user tokens — the typed contract every later story (services, adapters, server, hooks, components) reads from `@guepard/domain/entities`, `@guepard/domain/usecases`, and `@guepard/domain/repositories`.

## Scope

**In scope**

- `packages/domain/src/entities/user-token-scope.ts` — `UserTokenScopeSchema` (Zod enum `read | write | admin`) + inferred type.
- `packages/domain/src/entities/user-token-status.ts` — derived-only `UserTokenStatus` type + `deriveUserTokenStatus({ revoked, expires_at, nowUnix? })` pure function. Not a DB column; comment makes this explicit.
- `packages/domain/src/entities/user-token.type.ts` — `UserTokenSchema` and `UserToken` type matching `public.user_tokens` exactly (see §5.1 of the spec). Handles the unhardened `revoked` column via `.nullable().transform(v => v ?? false)`. Plus a `UserTokenEntity` class following the existing entity patterns (`@Expose()`, `plainToClass`, `create`/`update` factories).
- `packages/domain/src/usecases/dto/create-user-token.input.ts` — `CreateUserTokenInputSchema` with `.refine` enforcing `expires_at > now` and `expires_at - now <= 365 * 86400` seconds.
- `packages/domain/src/usecases/dto/create-user-token.output.ts` — `CreateUserTokenOutputSchema` with `row: UserTokenSchema` + `rawJwt: string`.
- `packages/domain/src/usecases/dto/revoke-user-token.output.ts` — alias of `UserTokenSchema`.
- `packages/domain/src/repositories/user-token.port.ts` — `abstract class IUserTokenRepository` with `findByAccountId(accountId)`, `create(input)`, `revoke(id, accountId)`.
- `packages/domain/src/repositories/jwt-signer.port.ts` — `abstract class IJwtSigner` with a single `sign(payload, options: { secret; algorithm: 'HS256' })` method. Keeps `jsonwebtoken` out of the domain layer.
- `packages/domain/src/exceptions/token-not-found.exception.ts`, `token-already-revoked.exception.ts`, `token-expiration-invalid.exception.ts` — domain exceptions following the existing `DomainException.new(...)` pattern.
- Extend `packages/domain/src/repositories/repositories.ts` — add `userToken: IUserTokenRepository` and `jwtSigner: IJwtSigner` fields to the `Repositories` abstract shape.
- Re-exports: `packages/domain/src/entities/index.ts`, `src/repositories/index.ts`, `src/usecases/index.ts`, `src/exceptions/index.ts`.
- Vitest tests: every Zod schema (valid/invalid parse cases), `deriveUserTokenStatus` for every status branch, refinement boundaries (now, now+1s, now+365d, now+365d+1s).

**Out of scope**

- Service implementations (→ Story 004).
- Any repository concrete implementation (→ Stories 005, 008).
- Wiring into `apps/server` or `apps/web` factories (→ Stories 005, 008).

## Acceptance criteria

- [x] `UserTokenSchema` matches `public.user_tokens` columns exactly — `id`, `account_id`, `token_name`, `scopes`, `expires_at` (number, Unix seconds), `revoked` (boolean after `.nullable().transform(v => v ?? false)`), `revoked_at`, `created_at`, `updated_at`, `created_by`, `updated_by`.
- [x] `UserTokenSchema.parse({ ..., revoked: null })` succeeds and returns `revoked: false` — covered by `__tests__/user-token/user-token-schema.test.ts > "coerces revoked: null to revoked: false"`.
- [x] `CreateUserTokenInputSchema.parse({...})` rejects empty `token_name`, empty `scopes`, `expires_at <= now`, `expires_at - now > 365 * 86400`. Accepts the boundary cases within range — all covered by `__tests__/user-token/create-user-token-input.schema.test.ts` with fake timers.
- [x] `deriveUserTokenStatus({ revoked: true, ... })` returns `'revoked'`; `{ revoked: false, expires_at: past }` returns `'expired'`; `{ revoked: false, expires_at: future }` returns `'active'` — covered by `__tests__/user-token/user-token-status.test.ts` truth table.
- [x] `IUserTokenRepository` and `IJwtSigner` are abstract classes (cannot be `new`'d directly) following the existing repository-port convention.
- [x] `Repositories` in `packages/domain/src/repositories/repositories.ts` has new `userToken` and `jwtSigner` fields.
- [x] `pnpm --filter @guepard/domain typecheck` passes (exit 0).
- [x] `pnpm --filter @guepard/domain test` passes with ≥ 90 % line coverage on the new files — **100 %** statement / branch / function / line on all four user-token source files.
- [x] No runtime import of `jsonwebtoken`, `@supabase/*`, or `react` inside `packages/domain`.

## Tasks

1. [001-add-user-token-entity-and-status-types](001-add-user-token-entity-and-status-types-[done].md) ✅ — domain layer. Scope enum + view-only `UserTokenStatus` + `deriveUserTokenStatus` helper + `UserTokenSchema` + `UserTokenEntity` class matching `public.user_tokens` exactly. Re-exported from `@guepard/domain/entities`. `pnpm --filter @guepard/domain typecheck` green.
2. [002-add-user-token-dtos-and-exceptions](002-add-user-token-dtos-and-exceptions-[done].md) ✅ — domain layer. `CreateUserTokenInputSchema` (with expiry refinement), `CreateUserTokenOutputSchema`, `RevokeUserTokenOutputSchema` in a single `user-token-usecase-dto.ts` (repo convention over the 3-separate-files plan). Three exception factory files (`token-not-found.exception.ts` + 2 siblings) wrapping `DomainException.new(...)` with `Code.USER_TOKEN_*` codes at `3000-3002`.
3. [003-add-user-token-and-jwt-signer-ports](003-add-user-token-and-jwt-signer-ports-[done].md) ✅ — domain layer. `IUserTokenRepository` abstract port (extends `RepositoryPort<UserToken, string>`, with `findByAccountId` / `create` / `revoke`), `IJwtSigner` abstract port + `JwtSignerPayload` / `JwtSignerOptions` literal-typed types, extended `Repositories` type with `userToken` + `jwtSigner`. Workspace-typecheck failure confined to 2 factory files (`apps/server/src/lib/repositories.ts:24`, `apps/web/src/lib/repositories/repositories-factory.ts:50`) — both resolve in Stories 005 (Supabase adapter) + 008 (HTTP adapter).
4. [004-cover-user-token-domain-with-tests](004-cover-user-token-domain-with-tests-[done].md) ✅ — tests. 5 Vitest files, 47 passing tests. **100 %** statement / branch / function / line coverage on `user-token-scope.ts`, `user-token-status.ts`, `user-token.type.ts`, `user-token-usecase-dto.ts` (way over the 90 % target). Fake-timer boundary tests verify the refinement at `now`, `now+1s`, `now+365d`, `now+365d+1s`.

## Demo / verification

```bash
pnpm --filter @guepard/domain typecheck
pnpm --filter @guepard/domain test -- user-token
# Optional: in a scratch test file, import and log
# import { UserTokenSchema, CreateUserTokenInputSchema, deriveUserTokenStatus }
#   from '@guepard/domain/entities';
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. **`no`** — three cosmetic deviations from spec §7.1 (single `user-token-usecase-dto.ts` instead of three DTO files; exception filenames `token-*-exception.ts` without the `user-token-` prefix; factory-function exceptions `tokenNotFoundException()` etc. instead of class-style names) chosen to match existing repo conventions. Functional contract identical. Spec Changelog entry dated 2026-04-15.

- [ ] The referenced spec sections still match the implementation as shipped.

## Notes

Populated per `/finish` task-branch step 4. Cap: 3 bullets.

- **Task 002 (2026-04-14)**: Three DTOs in one file `user-token-usecase-dto.ts` (repo convention over the 3-separate-files task plan). Exception factories (`token-*-exception.ts` × 3) wrap `DomainException.new({ code: Code.USER_TOKEN_* })`. Codes reserved at `3000-3002` in a new `User Token` block in `code.ts`.
- **Task 003 (2026-04-14)**: Ports shipped exactly as planned. Workspace typecheck surfaces exactly 2 expected errors — `apps/server/src/lib/repositories.ts:24` and `apps/web/src/lib/repositories/repositories-factory.ts:50`, both "missing properties from type 'Repositories': userToken, jwtSigner". Stories 005 and 008 will clear both factories. `IJwtSigner` intentionally synchronous (`: string`) — matches v1's `jsonwebtoken.sign(...)` and avoids unnecessary awaits at call sites.
- **Task 004 (2026-04-14)**: 47 passing tests across 5 files; **100 %** coverage on every user-token source file. Fake-timer pattern (`vi.useFakeTimers()` + `vi.setSystemTime(new Date('2026-04-14T00:00:00.000Z'))`) makes the refinement boundary tests (now / now+1s / now+365d / now+365d+1s) deterministic. Worth remembering: the task-001 "nullable-revoked transform" concern is captured in `user-token.type.ts` source comments + has a dedicated test in `user-token-schema.test.ts` — safe to drop that Notes bullet to stay at the 3-bullet cap.
