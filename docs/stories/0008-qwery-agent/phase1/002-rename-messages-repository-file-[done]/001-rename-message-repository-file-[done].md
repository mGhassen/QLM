---
story: ./story.md
status: done
layer: adapter
files:
  - apps/web/src/lib/repositories/messages.respository.ts
  - apps/web/src/lib/repositories/message.repository.ts
  - apps/web/src/lib/repositories-factory.ts
  - apps/web/src/lib/repositories/index.ts
---

# Rename message repository file

## Purpose

Rename the typo'd `messages.respository.ts` → `message.repository.ts` and update the two source imports, aligning the HTTP adapter filename with its Supabase sibling.

## Files

- `apps/web/src/lib/repositories/messages.respository.ts` → `message.repository.ts` — `git mv` preserves history.
- `apps/web/src/lib/repositories-factory.ts:15` — change module specifier `./repositories/messages.respository` → `./repositories/message.repository`.
- `apps/web/src/lib/repositories/index.ts:7` — change module specifier `./messages.respository` → `./message.repository`.

## Acceptance

- [x] `apps/web/src/lib/repositories/messages.respository.ts` no longer exists.
- [x] `apps/web/src/lib/repositories/message.repository.ts` exists with the unchanged `MessageRepository` export.
- [x] `grep -r "messages.respository" apps packages --include="*.ts" --include="*.tsx"` returns zero matches.
- [x] `pnpm typecheck` at repo root exits 0 (46/46 turbo tasks green).

## Test plan

```
git mv apps/web/src/lib/repositories/messages.respository.ts apps/web/src/lib/repositories/message.repository.ts
# Edit the two imports above, then:
grep -rn "messages.respository" apps packages --include="*.ts" --include="*.tsx" || echo "clean"
pnpm typecheck
```

## Notes

- Use `git mv` so the rename is tracked (the file is committed — unlike the untracked story folder rename earlier).
- Don't touch the Supabase sibling `packages/repositories/supabase/src/message.repository.ts`; it is already correctly named.
- Do NOT add any new repository method here — `getDefaultForProject` / equivalents land in story 003.
