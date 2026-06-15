---
story: ./story.md
status: pending
layer: tests
files:
  - packages/domain/__tests__/services/user-token/create-user-token.usecase.test.ts
  - packages/domain/__tests__/services/user-token/revoke-user-token.usecase.test.ts
  - packages/domain/__tests__/services/user-token/list-user-tokens.usecase.test.ts
---

# Cover user-token services with tests

## Purpose

Vitest suites that exercise the three services from task 001 against mock `IUserTokenRepository` + mock `IJwtSigner` implementations. Covers validation branches, the exact JWT claim shape, the null-from-repo → `tokenNotFoundException` path, and the pass-through behaviour of `list`.

## Files

- `packages/domain/__tests__/services/user-token/create-user-token.usecase.test.ts`:
  - Happy path: mock repo returns a row; mock signer asserts the exact payload `{ token_id, sub, scopes, exp, aud: 'authenticated', role: 'authenticated' }` and the options `{ secret: '<test-secret>', algorithm: 'HS256' }`; service returns `{ row, rawJwt }`.
  - Validation: empty `token_name` / empty `scopes` / `expires_at <= now` / `expires_at > now + 365d` all throw before touching the repo.
  - Repository-throws propagates: mock `repo.create` rejects with a Postgres-shaped error → service rethrows.
  - JWT-signer-throws propagates: mock `jwtSigner.sign` throws → service rethrows (persistence has already completed — document this as the phase-1 behaviour; Story 005's adapter can add rollback if it turns out to matter).
  - Use `vi.useFakeTimers()` + `vi.setSystemTime(...)` so the `.refine` boundary is deterministic.
- `packages/domain/__tests__/services/user-token/revoke-user-token.usecase.test.ts`:
  - Happy path: mock `repo.revoke(id, accountId)` returns the updated row; service returns it.
  - Null-from-repo: service throws a `DomainException` whose `code` is `Code.USER_TOKEN_NOT_FOUND_ERROR` and whose `data.tokenId` is the input id.
  - Repository-throws propagates.
- `packages/domain/__tests__/services/user-token/list-user-tokens.usecase.test.ts`:
  - Happy path: mock `repo.findByAccountId(accountId)` returns an array; service returns it unchanged.
  - Empty list: `[]` is returned as-is, no throw.
  - Repository-throws propagates.
- Mock implementations inline in each test file (the repo pattern per `delete-datasource.usecase.test.ts`) — no shared fixture file, since these are the first user-token service tests.

## Acceptance

- [ ] All three test files run clean via `pnpm --filter @qlm/domain exec vitest run __tests__/services/user-token`.
- [ ] ≥ 90 % line coverage on `packages/domain/src/services/user-token/*.usecase.ts`.
- [ ] The create test asserts the EXACT JWT payload and options shape via a mock-call assertion (`expect(jwtSignerMock.sign).toHaveBeenCalledWith(expectedPayload, expectedOptions)` or equivalent).
- [ ] The revoke null-path test verifies both the thrown exception's `code` (`Code.USER_TOKEN_NOT_FOUND_ERROR`) and `data.tokenId` match.
- [ ] Fake timers used for `.refine` boundary coverage; `vi.useRealTimers()` restored in `afterEach`.
- [ ] No hitting any real database / network / third-party library in any test.
- [ ] `pnpm --filter @qlm/domain test` passes end-to-end.

## Test plan

```
pnpm --filter @qlm/domain typecheck
pnpm --filter @qlm/domain exec vitest run __tests__/services/user-token
pnpm --filter @qlm/domain exec vitest run __tests__/services/user-token --coverage --coverage.include='src/services/user-token/*'
```

## Storybook validation

N/A — not a UI task.

## Notes

- Mock `IJwtSigner` — it's an abstract class, so mock via a plain class that extends it:
  ```ts
  class MockJwtSigner extends IJwtSigner {
    public readonly calls: Array<{ payload: JwtSignerPayload; options: JwtSignerOptions }> = [];
    sign(payload: JwtSignerPayload, options: JwtSignerOptions): string {
      this.calls.push({ payload, options });
      return 'mock-jwt-signature';
    }
  }
  ```
  Or use `vi.fn()` on a plain object cast — whichever reads cleanest.
- The `delete-datasource.usecase.test.ts` file is the canonical reference for the in-file mock-repo pattern.
