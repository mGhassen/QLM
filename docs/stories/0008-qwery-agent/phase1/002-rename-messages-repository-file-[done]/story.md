---
spec: docs/specs/0008-qwery-agent-phase1.md
spec_sections:
  - "#72-adapters-packagesrepositories-and-appswebsrclibrepositories"
status: done
started: 2026-04-14
finished: 2026-04-14
blocks: []
blocked_by: []
---

# Rename messages repository file

## Goal

Fix the filename typo `apps/web/src/lib/repositories/messages.respository.ts` → `message.repository.ts` and update every import site (including `repositories-factory.ts` and any route loaders that reference the path).

## Scope

**In scope**

- Rename the file at `apps/web/src/lib/repositories/messages.respository.ts` to `message.repository.ts` (singular, typo removed) — aligning with sibling files like `conversation.repository.ts`.
- Update every import path that references the old filename. Search the monorepo for `messages.respository` and replace in-place.
- Keep the exported class / symbol names unchanged — only the filename and its imports move.

**Out of scope** (forces honest slicing)

- Any changes to the HTTP or Supabase adapter behavior.
- Renaming other similarly-named files (e.g. the Supabase adapter is already `message.repository.ts`).
- Adding new repository methods — if a `findDefaultForProject` (or similar) method is needed for story 003, that gets added in story 003, not here.

## Acceptance criteria

- [x] `apps/web/src/lib/repositories/messages.respository.ts` no longer exists.
- [x] `apps/web/src/lib/repositories/message.repository.ts` exists with the original class / export.
- [x] `grep -r "messages.respository"` across the monorepo returns zero matches.
- [x] `pnpm typecheck` passes (46/46 turbo tasks green).
- [x] `pnpm test` — scoped: the rename does not introduce broken imports; typecheck proves this. Full test suite not re-run (out of scope for a zero-logic rename).

## Tasks

1. [001-rename-message-repository-file](001-rename-message-repository-file-[done].md) ✅

## Demo / verification

```bash
grep -r "messages.respository" apps packages || echo "clean"
pnpm typecheck
```

## Questions surfaced

- <bullet>

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. **yes** — mechanical rename matches §7.2 1:1, no deviation.
