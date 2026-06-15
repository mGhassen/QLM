---
spec: docs/specs/0030-predictions-relml-phase1.md
spec_sections:
  - "#71-domain-packagesdomain"
  - "#9-security-checklist"
status: pending
started: null
finished: null
blocks: ["005", "006"]
blocked_by: ["001", "003"]
---

# wire-domain-services

## Goal

Implement the seven domain services for snapshots and agent conversations, with full unit-test coverage of happy paths and the explicit guardrails (5 MB cap, version increment, audit hook).

## Scope

**In scope**
- `TakeSnapshotService` — validates `metadata` against `DatasourceMetadataZodSchema`, enforces 5 MB serialized cap (throws `DomainException`), computes the next `version` per `datasource_id` via the repository, persists via `repo.create`, returns the new snapshot.
- `ListSnapshotsByDatasourceService`, `GetSnapshotByIdService`.
- `CreateAgentConversationService` — pinned to a single `snapshot_id` at creation; rejects creating a conversation for a snapshot the user can't reach (relies on RLS enforcement at the adapter layer).
- `AppendAgentMessageService`, `ListAgentMessagesService`.
- Vitest specs co-located next to each service: happy path + each guardrail branch.

**Out of scope**
- Server routes that call these services — story 005.
- LLM streaming — story 005 owns the route, story 008 owns the UI.

## Acceptance criteria

- [ ] `pnpm --filter @guepard/domain test` is green.
- [ ] `TakeSnapshotService` test exercises: happy path, 5 MB cap rejection, malformed metadata rejection, monotonic version increment.
- [ ] All services accept their repository via constructor injection — no concrete class imports inside services.
- [ ] Domain remains pure: no `@tanstack/react-query`, no `@supabase/*`, no `fetch` imports anywhere under `packages/domain/src`.
- [ ] `pnpm typecheck` is green.

## Tasks

Populated by `/start-story`.

## Demo / verification

```bash
pnpm --filter @guepard/domain test
pnpm typecheck
```

## Questions surfaced

-

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
