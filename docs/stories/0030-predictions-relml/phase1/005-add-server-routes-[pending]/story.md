---
spec: docs/specs/0030-predictions-relml-phase1.md
spec_sections:
  - "#52-endpoints"
  - "#41-layered-sequence"
  - "#74-server-appsserver"
  - "#9-security-checklist"
status: pending
started: null
finished: null
blocks: ["006", "008"]
blocked_by: ["001", "004"]
---

# add-server-routes

## Goal

Stand up the five Predictions endpoints in Hono — snapshot create (server-fetched + from-client), snapshot list, snapshot get, and the streaming agent route — with a scope-locked system-prompt builder and route tests.

## Scope

**In scope**
- `apps/server/src/routes/predictions.ts` — the five endpoints from spec §5.2.
  - Server-fetched snapshot route resolves the driver via `ExtensionsRegistry` + `getDriverInstance`; if `driver.runtime !== 'node'`, returns 422 `{ error: 'browser_runtime_only' }` so the client falls back to `from-client`.
  - From-client snapshot route accepts `{ metadata }`, validates against `DatasourceMetadataZodSchema`, then calls `TakeSnapshotService`.
  - Agent route loads snapshot, builds the system prompt, calls `streamText({ model: getDefaultModel() … })`, returns `result.toTextStreamResponse()`.
- `apps/server/src/lib/predictions/build-system-prompt.ts` — exported pure function `(metadata, datasourceName) => string`. Embeds a SimpleSchema projection plus a scope-lock (refuse non-schema topics, no tool use, do not invent PKs/FKs absent from the snapshot).
- `apps/server/src/server.ts` — register `api.route('/predictions', createPredictionsRoutes(getRepos))`.
- Route tests in `apps/server/__tests__/predictions.test.ts` using `createMockRepositories()` + a stubbed driver registry: happy path snapshot, browser-runtime → 422, malformed metadata → 400, 5 MB cap → 413, agent route returns text stream.

**Out of scope**
- Web client wiring — story 006.
- UI components — stories 007, 008.

## Acceptance criteria

- [ ] `pnpm --filter server test` is green; new route test file passes.
- [ ] All five endpoints respond per spec §5.2 (status codes, response shapes).
- [ ] System prompt explicitly forbids tool use, side effects, and structural claims absent from the snapshot.
- [ ] No `service_role` usage in any predictions handler.
- [ ] `pnpm typecheck` is green.
- [ ] Manual: `curl -X POST localhost:4096/api/predictions/snapshots/{id}/agent -d '{"messages":[{"role":"user","content":"hi"}]}'` streams a response when an LLM key is configured.

## Tasks

Populated by `/start-story`.

## Demo / verification

```bash
pnpm --filter server test
pnpm server:dev
# in another shell:
curl -i -X POST http://localhost:4096/api/predictions/datasources/<id>/snapshots
```

## Questions surfaced

-

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
