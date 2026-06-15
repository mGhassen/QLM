---
spec: docs/specs/0001-integrations-phase1.md
spec_sections:
  - "#73-supabase-adapter-packagesrepositoriessupabase"
  - "#74-http-adapter-appswebsrclibrepositories"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks: []
blocked_by:
  - 001-model-integration-domain
  - 002-create-integrations-schema
---

# Wire repository adapters

## Goal

Implement both adapters of the `IIntegrationConnectionRepository` port — the Supabase adapter for server-side use and the HTTP adapter for the browser — and wire them into their respective factories.

## Scope

**In scope**
- Supabase adapter (`packages/repositories/supabase/src/integration-connection.repository.ts`) that maps DB rows to the entity and back
- HTTP adapter (`apps/web/src/lib/repositories/integration-connection.repository.ts`) whose port write methods throw and whose real surface is the `IntegrationsHttpClient` structural type the shell runtime consumes
- Wire both into their factories
- Keep secrets off the browser adapter — no method returns `secretRef`

**Out of scope**
- Server routes themselves → story 005
- Shell runtime resource → story 006

## Acceptance criteria

- [x] Supabase adapter's generic `update()` only touches non-secret fields; test results and rotation go through dedicated methods
- [x] HTTP adapter hits `/integrations/*` and never decodes `secretRef`
- [x] `apps/web/src/lib/repositories-factory.ts` (the runtime-active one, not the nested legacy copy) wires `integrationConnection` into the repositories map
- [x] `pnpm --filter @guepard/repository-supabase typecheck` + `pnpm --filter web typecheck` green

## Tasks

Shipped files:

- `packages/repositories/supabase/src/integration-connection.repository.ts` — `IntegrationConnectionRepository` implementing the port; `updateTestResult` + `updateCredentialsRef` are dedicated methods
- `packages/repositories/supabase/src/index.ts` — barrel update
- `apps/web/src/lib/repositories/integration-connection.repository.ts` — `IntegrationConnectionHttpRepository`; port writes throw, real surface is `listByProject / getById / createIntegration / renameIntegration / rotateCredentials / deleteIntegration / runTest / runTestDraft / listRegionsById`
- `apps/web/src/lib/repositories-factory.ts` — wires `integrationConnection: new IntegrationConnectionHttpRepository()` into the map passed to `ShellAppProvider`

## Demo / verification

```bash
pnpm --filter @guepard/repository-supabase typecheck
pnpm --filter web typecheck
```

From the web app, `useShell()` exposes `shell.integrations.*` with no type errors.

## Questions surfaced

- Initially wired the HTTP adapter into the wrong (nested, dead-code) factory at `apps/web/src/lib/repositories/repositories-factory.ts`. Fixed by wiring into the runtime-active `apps/web/src/lib/repositories-factory.ts`. Not a spec deviation — just an implementation mis-step; leaving the note for anyone else touching this area.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
