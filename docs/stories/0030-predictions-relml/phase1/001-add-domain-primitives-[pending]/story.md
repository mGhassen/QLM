---
spec: docs/specs/0030-predictions-relml-phase1.md
spec_sections:
  - "#71-domain-packagesdomain"
  - "#51-data-shapes-typescript"
status: pending
started: null
finished: null
blocks: ["003", "004", "005", "006"]
blocked_by: []
---

# add-domain-primitives

## Goal

Add the entities, repository ports, and DTOs the rest of phase 1 will plug into — pure types and abstract classes, no logic.

## Scope

**In scope**
- `PredictionSchemaSnapshot` entity with Zod schema (mirrors `notebook.type.ts` pattern; embeds `DatasourceMetadataZodSchema`).
- `PredictionAgentConversation` entity with Zod schema.
- `PredictionAgentMessage` entity with Zod schema (role enum, content text).
- Three abstract repository ports: `IPredictionSchemaSnapshotRepository`, `IPredictionAgentConversationRepository`, `IPredictionAgentMessageRepository`.
- DTOs in `packages/domain/src/usecases/dto/prediction-usecase-dto.ts` (`TakeSnapshotInput`, `AskAgentInput`, output shapes).
- Empty service stubs (constructor injection only; `execute(...)` throws `NotImplemented`) in `packages/domain/src/services/prediction/`.
- Add the three port slots to the aggregate `Repositories` interface and re-export from `packages/domain/src/repositories/index.ts`.

**Out of scope** (forces honest slicing)
- Service implementations — story 004.
- Adapter implementations (Supabase or HTTP) — stories 003 and 006.
- Server routes — story 005.

## Acceptance criteria

- [ ] `pnpm --filter @qlm/domain typecheck` is green.
- [ ] `pnpm --filter @qlm/domain test` is green (no new behavior tests yet — story 004 owns those).
- [ ] All three new entities are exported from `@qlm/domain/entities`.
- [ ] All three new ports are exported from `@qlm/domain/repositories` and listed on the aggregate `Repositories` interface.
- [ ] `import type { PredictionSchemaSnapshot } from '@qlm/domain/entities'` resolves from the web and server apps.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

## Demo / verification

```bash
pnpm --filter @qlm/domain typecheck
pnpm --filter @qlm/domain test
```

Inspect [packages/domain/src/entities/index.ts](packages/domain/src/entities/index.ts) and confirm the three new exports.

## Questions surfaced

- (none yet — populated during implementation if anything unexpected comes up)

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`.

- [ ] The referenced spec sections still match the implementation as shipped.
