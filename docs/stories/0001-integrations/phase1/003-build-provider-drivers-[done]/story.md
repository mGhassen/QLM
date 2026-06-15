---
spec: docs/specs/0001-integrations-phase1.md
spec_sections:
  - "#72-drivers-packagesintegrations-drivers--new-package"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks: []
blocked_by:
  - 001-model-integration-domain
---

# Build provider drivers

## Goal

Create the server-only `@qlm/integrations-drivers` package that implements `IIntegrationProviderDriver` for AWS and GCP, with a registry that resolves a driver by provider id. Keep the domain layer pure — all SDK imports live in this package.

## Scope

**In scope**
- New package `packages/integrations-drivers`
- `AwsIntegrationDriver` using `@aws-sdk/client-sts` (`GetCallerIdentityCommand`) + `@aws-sdk/client-ec2` (`DescribeRegionsCommand`)
- `GcpIntegrationDriver` using `google-auth-library` JWT + REST calls to `cloudresourcemanager.googleapis.com` + `compute.googleapis.com`
- `IntegrationProviderDriverRegistry extends IIntegrationProviderDriverRegistry`
- Error mapping to the closed `TestResultErrorCode` set (`invalid_credentials | network | permission_denied | unknown`)
- 28 unit tests: success + four error-code branches per driver + registry resolution

**Out of scope**
- Secret vault (lives in the server, not the driver) → story 005
- Rate limiter → story 005

## Acceptance criteria

- [x] `packages/integrations-drivers` builds clean, no imports from `packages/domain` at runtime (only type imports)
- [x] Both drivers accept factory-injected clients so tests can stub them without touching the network
- [x] `pnpm --filter @qlm/integrations-drivers test` runs 28 passing tests
- [x] `IntegrationProviderDriverRegistry.get('aws' | 'gcp')` returns the right driver; unknown providers throw

## Tasks

Shipped files:

- `packages/integrations-drivers/package.json` — new package, AWS SDK + google-auth-library deps
- `packages/integrations-drivers/src/index.ts` — barrel
- `packages/integrations-drivers/src/aws/aws-driver.ts` — `test()` + `listRegions()` with factory-injected STS + EC2 clients
- `packages/integrations-drivers/src/aws/error-mapping.ts` — AWS SDK error name / code → `TestResultErrorCode`
- `packages/integrations-drivers/src/gcp/gcp-driver.ts` — JWT client + REST calls for `projects.get` + `regions.list`
- `packages/integrations-drivers/src/gcp/error-mapping.ts` — `fetch` status + google-auth error → `TestResultErrorCode`
- `packages/integrations-drivers/src/registry.ts` — `IntegrationProviderDriverRegistry`
- `packages/integrations-drivers/__tests__/aws-driver.test.ts` — 10 tests
- `packages/integrations-drivers/__tests__/gcp-driver.test.ts` — 14 tests
- `packages/integrations-drivers/__tests__/registry.test.ts` — 4 tests

## Demo / verification

```bash
pnpm --filter @qlm/integrations-drivers test
pnpm --filter @qlm/integrations-drivers typecheck
```

28 tests green. No network traffic (all SDK clients stubbed).

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
