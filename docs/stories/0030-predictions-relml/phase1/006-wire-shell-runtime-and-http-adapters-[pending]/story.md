---
spec: docs/specs/0030-predictions-relml-phase1.md
spec_sections:
  - "#73-shell-runtime-packagesshell-runtime"
  - "#72-adapters-packagesrepositoriessupabase-and-appswebsrclibrepositories"
  - "#52-endpoints"
status: pending
started: null
finished: null
blocks: ["007", "008"]
blocked_by: ["001", "003", "004", "005"]
---

# wire-shell-runtime-and-http-adapters

## Goal

Make `useShell().predictions.*` callable end-to-end from the web app: HTTP adapters call the new server routes, the shell-runtime resource composes them with services, and the host provides a streaming agent fn.

## Scope

**In scope**
- HTTP repository adapters in `apps/web/src/lib/repositories/`:
  - `prediction-schema-snapshot.repository.ts` (calls `/api/predictions/...`).
  - `prediction-agent-conversation.repository.ts`.
  - `prediction-agent-message.repository.ts`.
- `apps/web/src/lib/repositories-factory.ts` — wire all three.
- `packages/shell-runtime/src/resources/predictions.ts` — `createPredictionsResource(...)` returning `{ snapshots: { list, latest, take, takeFromClient, get }, agent: { stream }, keys, invalidate }`.
- `packages/shell-runtime/src/client.ts` — expose `predictions` on the shell client.
- `packages/shell-runtime/src/context.ts` — add `predictionsAgentStreamFn` type. Host implementation lives in `apps/web/src/shell/...` and returns a `ReadableStream<string>` of assistant text from the SSE response.

**Out of scope**
- UI components — stories 007 and 008.
- i18n — story 009.

## Acceptance criteria

- [ ] `useShell()` exposes `predictions` with the methods listed above.
- [ ] HTTP adapters use the standard `apiRequest` helper (or whatever the existing repos use) with project-scope auth.
- [ ] The `take` method automatically falls back to `takeFromClient` when the server returns 422 `browser_runtime_only`, sourcing the metadata from the existing `shell.datasources.metadata(...)` host dispatch.
- [ ] `pnpm typecheck` is green.
- [ ] No new server endpoints are introduced (this story is wiring only).

## Tasks

Populated by `/start-story`.

## Demo / verification

```bash
pnpm typecheck
pnpm dev
# In the browser console of any project:
# > await window.__shell__?.predictions.snapshots.list()    // shape only — empty list ok
```

## Questions surfaced

-

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
