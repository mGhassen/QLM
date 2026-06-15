---
spec: docs/specs/0001-integrations-phase1.md
spec_sections:
  - "#75-shell-runtime-packagesshell-runtime"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks: []
blocked_by:
  - 004-wire-repository-adapters
---

# Expose shell runtime resource

## Goal

Expose a typed `shell.integrations.*` client from `@qlm/shell-runtime` so plugin apps consume integrations through `useShell()` without ever touching the HTTP adapter or domain services directly.

## Scope

**In scope**
- `createIntegrationsResource({ repository, currentProjectId })` factory
- Methods: `list`, `get`, `create`, `rename`, `rotateCredentials`, `delete`, `test`, `testDraft`, `listRegions`
- React Query `keys` + `invalidate.list/.detail(id)` helpers
- Structural `IntegrationsHttpClient` type so the runtime does not bleed back into `apps/web`
- Wire into `ShellClient` / `useShell()` via `packages/shell-runtime/src/client.ts`

**Out of scope**
- HTTP adapter behind the client → story 004
- Plugin UI consuming `shell.integrations` → story 007

## Acceptance criteria

- [x] `shell.integrations` exposes every method listed above
- [x] `shell.integrations.keys` returns stable React Query keys namespaced under the current project id
- [x] `pnpm --filter @qlm/shell-runtime typecheck` green
- [x] Plugin app consumers import `shell.integrations` with no `as unknown as` casts

## Tasks

Shipped files:

- `packages/shell-runtime/src/resources/integrations.ts` — `createIntegrationsResource` + `IntegrationsHttpClient` structural type
- `packages/shell-runtime/src/client.ts` — wires the resource into `ShellClient` and casts `repositories.integrationConnection as unknown as IntegrationsHttpClient` at the single wiring point
- `packages/shell-runtime/src/index.ts` — barrel update for the new resource type exports

## Demo / verification

```bash
pnpm --filter @qlm/shell-runtime typecheck
```

From a plugin, `const shell = useShell(); shell.integrations.list()` type-checks and returns the sanitised DTOs.

## Questions surfaced

- Intentionally chose a structural `IntegrationsHttpClient` type instead of extending the domain port, so the shell runtime stays decoupled from `apps/web`. Cast lives at one wiring point. Not a spec deviation — consistent with §4.2 layering guidance.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
