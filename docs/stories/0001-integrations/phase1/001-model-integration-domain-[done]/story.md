---
spec: docs/specs/0001-integrations-phase1.md
spec_sections:
  - "#71-domain-packagesdomain"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks: []
blocked_by: []
---

# Model integration domain

## Goal

Land the pure-TypeScript entity, DTOs, repository port, driver port, and six use-case services with unit tests so every outer layer can depend on a stable integration-domain shape.

## Scope

**In scope**
- `IntegrationConnectionEntity` Zod schemas + factories
- `IntegrationConnectionOutput` DTO (sanitised — no `secretRef` on the wire)
- Abstract repository port + driver port + driver-registry port
- Six services: create, update, update-credentials, test, list-regions, delete
- 21 service unit tests against an in-memory repo + fake driver

**Out of scope**
- Adapters (supabase / HTTP) → story 004
- Runtime wiring → stories 005, 006
- UI → story 007

## Acceptance criteria

- [x] `IntegrationConnectionEntity` + `IntegrationConnectionOutput` exported from `@guepard/domain`
- [x] `IIntegrationConnectionRepository` abstract class exported from `@guepard/domain/repositories`
- [x] `IIntegrationProviderDriver` + `IIntegrationProviderDriverRegistry` exported from `@guepard/domain/services/integration`
- [x] All six services implement their use-case interface and throw `DomainException.new({ code })` on failure, never plain `Error`
- [x] `pnpm --filter @guepard/domain test` passes (21 new integration service tests)

## Tasks

Shipped files (retroactive — tasks were not scaffolded via `/start-story` because this story was reconstructed from the implementation history):

- `packages/domain/src/entities/integration-connection.type.ts` — Zod schemas + `IntegrationConnectionEntity.create/update` factories
- `packages/domain/src/usecases/dto/integration-usecase-dto.ts` — `IntegrationConnectionOutput`, `AwsCredentialsInput | GcpCredentialsInput`, `TestResult`, `Region`, `CreateIntegrationConnectionInput`, `UpdateIntegrationCredentialsInput`
- `packages/domain/src/repositories/integration-connection-repository.port.ts` — abstract port extending `RepositoryPort`
- `packages/domain/src/services/integration/provider-driver.port.ts` — `IIntegrationProviderDriver` + `IIntegrationProviderDriverRegistry` abstract class + `RevealedCredentials` union
- `packages/domain/src/services/integration/credential-payload.ts` — `splitCredentialsForStorage` + `buildRevealedCredentials`
- `packages/domain/src/services/integration/create-integration-connection.service.ts`
- `packages/domain/src/services/integration/update-integration-connection.service.ts`
- `packages/domain/src/services/integration/update-integration-credentials.service.ts`
- `packages/domain/src/services/integration/test-integration-connection.service.ts`
- `packages/domain/src/services/integration/list-integration-regions.service.ts`
- `packages/domain/src/services/integration/delete-integration-connection.service.ts`
- `packages/domain/src/services/integration/index.ts` — barrel
- `packages/domain/__tests__/services/integration/mocks.ts` — in-memory repo + fake driver + fake vault helpers
- `packages/domain/__tests__/services/integration/*.test.ts` — 21 tests across the six services
- `packages/domain/src/common/code.ts` — added `2900` → `2903` (`INTEGRATION_NOT_FOUND_ERROR`, `INTEGRATION_VALIDATION_ERROR`, `INTEGRATION_DRIVER_ERROR`, `INTEGRATION_PROVIDER_MISMATCH_ERROR`)
- `packages/domain/src/repositories/repositories.ts` — added `integrationConnection: IIntegrationConnectionRepository` field

## Demo / verification

```bash
pnpm --filter @guepard/domain test -- integration
pnpm --filter @guepard/domain typecheck
```

Both commands return green. `IntegrationConnectionEntity` and `IntegrationConnectionOutput` are importable from `@guepard/domain`.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
