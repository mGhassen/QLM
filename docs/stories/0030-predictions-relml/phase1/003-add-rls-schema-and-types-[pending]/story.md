---
spec: docs/specs/0030-predictions-relml-phase1.md
spec_sections:
  - "#61-schema"
  - "#62-config--payload-contracts"
  - "#8-permissions-and-rls"
  - "#72-adapters-packagesrepositoriessupabase-and-appswebsrclibrepositories"
status: pending
started: null
finished: null
blocks: ["004", "006"]
blocked_by: ["001"]
---

# add-rls-schema-and-types

## Goal

Land the three new tables (`prediction_schema_snapshots`, `prediction_agent_conversations`, `prediction_agent_messages`) with RLS enabled, regenerate `database.types.ts`, and implement Supabase repository adapters against the new ports.

## Scope

**In scope**
- New numbered SQL file under `apps/web/supabase/schemas/` containing the DDL from spec §6.1 verbatim — three tables, RLS enabled, explicit per-operation policies (read, insert; conversations also update on owner-only), append-only design (no update / delete on snapshots or messages).
- `pnpm supabase:web:reset && pnpm supabase:web:typegen` and commit the regenerated `apps/web/supabase/database.types.ts`.
- Supabase repository implementations:
  - `packages/repositories/supabase/src/prediction-schema-snapshot.repository.ts`
  - `packages/repositories/supabase/src/prediction-agent-conversation.repository.ts`
  - `packages/repositories/supabase/src/prediction-agent-message.repository.ts`
- Re-export from `packages/repositories/supabase/src/index.ts`.

**Out of scope**
- HTTP adapters — story 006.
- Service implementations that consume these adapters — story 004.

## Acceptance criteria

- [ ] `pnpm supabase:web:reset` runs cleanly with the new SQL applied.
- [ ] `pnpm supabase:web:typegen` regenerates `database.types.ts` and the diff includes the three new tables.
- [ ] Each Supabase repository implements its abstract port (every method signature lines up).
- [ ] RLS policies use `has_role_on_organization` against the project's organization (no `SECURITY DEFINER`, no `USING (true)`).
- [ ] No `UPDATE` or `DELETE` policy exists on `prediction_schema_snapshots` or `prediction_agent_messages`.
- [ ] `pnpm typecheck` is green across the workspace.

## Tasks

Populated by `/start-story`.

## Demo / verification

```bash
pnpm supabase:web:reset
pnpm supabase:web:typegen
pnpm typecheck
```

Then in Studio (`http://127.0.0.1:18787` per the local config), confirm the three tables exist, RLS is on, and the policies are listed.

## Questions surfaced

-

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
