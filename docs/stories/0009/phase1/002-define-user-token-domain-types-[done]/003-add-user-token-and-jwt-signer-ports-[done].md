---
story: ./story.md
status: done
layer: domain
files:
  - packages/domain/src/repositories/user-token.port.ts
  - packages/domain/src/repositories/jwt-signer.port.ts
  - packages/domain/src/repositories/repositories.ts
  - packages/domain/src/repositories/index.ts
---

# Add user-token and jwt-signer ports

## Purpose

Ship the two abstract ports that the Supabase adapter (Story 005) and the HTTP adapter (Story 008) implement: `IUserTokenRepository` for persistence and `IJwtSigner` for JWT signing — explicitly kept separate so `jsonwebtoken` never enters the pure-domain layer. Extend the `Repositories` type accordingly.

## Files

- `packages/domain/src/repositories/user-token.port.ts`:
  ```
  abstract class IUserTokenRepository extends RepositoryPort<UserToken, string> {
    abstract findByAccountId(accountId: string): Promise<UserToken[]>;
    abstract create(input: {
      account_id: string;
      token_name: string;
      scopes: UserTokenScope[];
      expires_at: number;
    }): Promise<UserToken>;
    abstract revoke(id: string, accountId: string): Promise<UserToken | null>;
  }
  ```
  Follow `datasource-repository.port.ts` for the existing pattern (extend `RepositoryPort`, `abstract class`, imports from `../entities`).
- `packages/domain/src/repositories/jwt-signer.port.ts`:
  ```
  export type JwtSignerPayload = {
    token_id: string;
    sub: string;             // account_id
    scopes: UserTokenScope[];
    exp: number;             // Unix seconds
    aud: 'authenticated';
    role: 'authenticated';
  };

  export type JwtSignerOptions = {
    secret: string;
    algorithm: 'HS256';
  };

  abstract class IJwtSigner {
    abstract sign(payload: JwtSignerPayload, options: JwtSignerOptions): string;
  }
  ```
  Does NOT extend `RepositoryPort` — it's a service port, not a persistence port. Place it in `repositories/` anyway for locality (the factory wires it alongside repositories), unless a `services/` or `ports/` folder already exists that's a better home — verify during implementation.
- `packages/domain/src/repositories/repositories.ts` — add two fields to the `Repositories` type:
  ```
  userToken: IUserTokenRepository;
  jwtSigner: IJwtSigner;
  ```
  Both alphabetised where the existing fields sit. Add the two imports at the top.
- `packages/domain/src/repositories/index.ts` — re-export `IUserTokenRepository`, `IJwtSigner`, `JwtSignerPayload`, `JwtSignerOptions`.

## Acceptance

- [ ] `IUserTokenRepository` is an `abstract class` and cannot be instantiated directly — a test that does `new IUserTokenRepository()` fails to compile (TypeScript error TS2511).
- [ ] `IUserTokenRepository` extends `RepositoryPort<UserToken, string>` — reusing the existing base-port convention.
- [ ] `IJwtSigner` is an `abstract class` with a single abstract `sign(payload, options): string` method.
- [ ] `JwtSignerPayload.aud` is literally the string `'authenticated'` (not a generic string) — matches v1 JWT shape per spec §6.3.
- [ ] `JwtSignerOptions.algorithm` is literally `'HS256'`.
- [ ] `Repositories` type now has both `userToken: IUserTokenRepository` and `jwtSigner: IJwtSigner` fields.
- [ ] `@qlm/domain/repositories` re-exports all new symbols.
- [ ] `pnpm --filter @qlm/domain typecheck` passes.
- [ ] `pnpm typecheck` across the full workspace passes — in particular, `apps/server/src/lib/repositories.ts` and `apps/web/src/lib/repositories/*` will report "missing `userToken` / `jwtSigner`" errors if they construct a `Repositories` object. This is **expected** — those are unwired until Story 005 (Supabase adapter) and Story 008 (HTTP adapter). Acceptable resolutions:
  - (a) Accept the workspace-level errors and document them explicitly in this task's Notes; they'll be resolved by Stories 005 / 008.
  - (b) Stub a `new Proxy()` or `throw new Error('not wired yet')` placeholder in the factories so the workspace stays green. **Recommend (a)** — the errors surface the unwired state honestly.

## Test plan

```
pnpm --filter @qlm/domain typecheck
# Full workspace typecheck will fail on unwired Repositories construction
# at apps/server and apps/web until Stories 005 / 008. That's expected per
# the acceptance criteria above.
pnpm typecheck 2>&1 | tee /tmp/typecheck.log
grep -c "userToken\|jwtSigner" /tmp/typecheck.log
# Expect: matches confined to factory files in apps/server, apps/web —
# no new errors in packages/domain, packages/repositories/supabase, or
# packages/features/user-tokens.
```

## Storybook validation

N/A — not a UI task.

## Notes

- `IJwtSigner` explicitly avoids any `@types/jsonwebtoken` import — the port only declares the contract; the adapter in Story 005 picks up `jsonwebtoken` as a runtime dep.
- If `RepositoryPort` doesn't fit `IJwtSigner` (service port, not persistence), put it at the same path anyway (`repositories/jwt-signer.port.ts`) for factory-wiring locality — the convention favours co-location of things the repositories factory constructs. Verify by checking whether any existing port in that folder doesn't extend `RepositoryPort`.
- Acceptable that the workspace-wide typecheck fails until Story 005 + 008 land — this is an honest signal that ports need adapters. Document the exit status in this task's demo output.
