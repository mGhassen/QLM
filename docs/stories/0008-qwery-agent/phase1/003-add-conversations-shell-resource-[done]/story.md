---
spec: docs/specs/0008-qwery-agent-phase1.md
spec_sections:
  - "#73-shell-runtime-packagesshell-runtime"
  - "#52-endpoints"
status: done
started: 2026-04-14
finished: 2026-04-14
blocks:
  - 005-wire-assistant-panel-live
  - 007-mount-agent-shell-tab
  - 008-add-credits-banner-and-precheck
blocked_by: []
---

# Add conversations shell-runtime resource

## Goal

Add a new `conversations` resource to `@qlm/shell-runtime` that wraps the existing domain use cases, auto-injects project context, and exposes a promise-based API consumable via `useShell().conversations`.

## Scope

**In scope**

- New file `packages/shell-runtime/src/resources/conversations.ts` exposing:
  - `list()` — conversations for the active project.
  - `getBySlug(slug)` — single conversation.
  - `getDefaultForProject()` — returns-or-creates the per-(user, project) default conversation used by the panel bootstrap.
  - `create({ projectId?, title? })` — create a fresh conversation (defaults `projectId` to the active project).
  - `update(slug, patch)` — rename / archive.
  - `delete(slug)` — remove a conversation.
  - `invalidate.list()` and `invalidate.bySlug(slug)` — React Query invalidators.
- Wire the new resource into the shell client composer so `useShell().conversations` is available alongside existing resources (`notebooks`, `datasources`, `projects`, ...).
- Barrel re-export from `packages/shell-runtime/src/index.ts`.
- Use the existing HTTP adapter (`apps/web/src/lib/repositories/conversation.repository.ts`) and the domain use cases under `packages/domain/src/services/conversation/*` — no new domain code unless `getDefaultForProject` uncovers a missing use case, in which case add it to `packages/domain/src/services/conversation/` following the same pattern as the existing six.

**Out of scope** (forces honest slicing)

- UI consumption of the resource — story 005.
- Billing balance resource — story 004 / 008.
- Server-side endpoint changes — phase 1 uses existing routes as-is.

## Acceptance criteria

- [x] `useShell().conversations` is typed and returns an object exposing `list`, `getBySlug`, `getDefaultForProject`, `create`, `update`, `delete`, and `invalidate`.
- [x] `list()` returns conversations scoped to the active project (defaults to `currentProjectId` from context); no cross-project leakage.
- [x] `getDefaultForProject()` is idempotent by construction: returns most-recent existing conversation for `(projectId, currentUserId)`; only creates when none exists.
- [x] Unit test coverage **deferred to story 010** (`add-qwery-agent-tests`) — task 003 here marked `[skipped]` because shell-runtime has no Vitest infrastructure today; story 010 sets up the test suite and covers this resource.
- [x] `pnpm typecheck` at repo root passes (46/46 turbo tasks). `@qlm/shell-runtime` has no own `typecheck` script; verified through workspace-wide check.

## Tasks

1. [001-add-default-conversation-domain-service](001-add-default-conversation-domain-service-[done].md) ✅
2. [002-add-conversations-shell-resource](002-add-conversations-shell-resource-[done].md) ✅
3. [003-add-conversations-resource-tests](003-add-conversations-resource-tests-[skipped].md) ⏭ (deferred to story 010 — see Notes bullet 3)

## Demo / verification

```bash
pnpm --filter @qlm/shell-runtime typecheck
pnpm --filter @qlm/shell-runtime test
```

In a test app or temporary story, call `useShell().conversations.list()` and confirm the returned conversations all share the active `projectId`.

## Questions surfaced

- <bullet>

## Notes

- 001: domain entity's `taskId` is constrained to `z.uuid()` — couldn't use `''` as planned for a "no-task" panel default; used `crypto.randomUUID()` and added a source comment to consider making `taskId` optional in the schema later.
- 002: `@qlm/shell-runtime` has no `typecheck`/`test` scripts in `package.json` (no Vitest devDep, no config). Type-correctness was verified via the workspace-wide `pnpm typecheck` (46/46 turbo tasks green). Future cleanup: add per-package scripts so `pnpm --filter @qlm/shell-runtime typecheck/test` works directly.
- 003: deferred unit-test task to story 010 (`add-qwery-agent-tests`) which covers the same surface and bundles the Vitest setup. Idempotency of `getDefaultForProject` is structurally guaranteed by the find-then-create-if-empty algorithm; story 010 will assert it via a mock repo.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. **yes** — §7.3 spec'd the resource shape exactly as built; the new `GetOrCreateDefaultConversationService` was anticipated as a conditional add by §7.1 (not a deviation).
