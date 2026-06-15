---
spec: docs/specs/0001-integrations-phase1.md
spec_sections:
  - "#76-server-appsserver"
  - "#77-vault"
  - "#9-security-checklist"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks: []
blocked_by:
  - 001-model-integration-domain
  - 003-build-provider-drivers
  - 004-wire-repository-adapters
---

# Expose server routes

## Goal

Land nine Hono routes under `/integrations`, back them with an AES-256-GCM secret vault and a sliding-window rate limiter, extend the log redaction list, and cover every happy + error path with route tests.

## Scope

**In scope**
- `createIntegrationsRoutes()` factory — nine routes wired to `createRepositories(c)` + `driverRegistry` + `secretVault`
- `AesGcmSecretVault` — 96-bit IV, 128-bit GCM authTag, AAD bound to `keyName`, stateless handle `enc:v1:<iv>:<authTag>:<ciphertext>:<keyName>` (base64url); `forget()` is a boot-time console-warn stub
- `createRateLimiter({ windowMs, max })` — in-memory sliding window, decisioned as `{ allowed, retryAfterSeconds }`
- Driver registry bootstrapper (lazy singleton)
- Feature-flag check (`VITE_FEATURE_INTEGRATIONS=false` → 404 on every route)
- 16 route tests exercising happy path + validation + RLS denial + rate limit

**Out of scope**
- HTTP adapter on the browser → story 004
- UI → story 007

## Acceptance criteria

- [x] `GET /`, `POST /test-draft`, `POST /`, `GET /:id`, `PATCH /:id`, `PUT /:id/credentials`, `DELETE /:id`, `POST /:id/test`, `GET /:id/regions` all land
- [x] Secrets are JSON-serialised before vault protection and never round-trip to the browser after the initial POST
- [x] Rate limiter is applied to `POST /test-draft` and `POST /:id/test`
- [x] Server log redaction list includes every integration credential field name
- [x] `pnpm --filter @guepard/server test __tests__/integrations.test.ts` — 16 passing

## Tasks

Shipped files:

- `apps/server/src/lib/secret-vault.ts` — `AesGcmSecretVault` + `ISecretVault` impl
- `apps/server/src/lib/rate-limiter.ts` — sliding-window limiter + `RateLimitDecision`
- `apps/server/src/lib/integration-driver-registry.ts` — lazy singleton `IntegrationProviderDriverRegistry`
- `apps/server/src/routes/integrations.ts` — nine routes + feature-flag guard + Zod validation
- `apps/server/src/server.ts` — extended `CreateAppOptions` with `secretVault` + `integrationDriverRegistry` overrides + mounted `/integrations`
- `apps/server/src/lib/logger-redaction.ts` — added integration credential field names
- `apps/server/__tests__/integrations.test.ts` — 16 tests (imports `createIntegrationsRoutes` directly to dodge the pre-existing `@mlc-ai/web-llm` ESM issue in `server.ts`)
- `apps/server/__tests__/helpers/mock-repositories.ts` — added `integrationConnection` mock

## Demo / verification

```bash
pnpm --filter @guepard/server test __tests__/integrations.test.ts
pnpm --filter @guepard/server typecheck
```

16 tests pass. Secrets never appear in response bodies or logs.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes** — with the caveat that `ISecretVault.forget` is a stub (documented in the spec §Changelog and RFC §Amendments A2).
