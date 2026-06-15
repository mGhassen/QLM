---
story: ./story.md
status: done
layer: plugin
files:
  - packages/apps/notebook/src/plugin-root.tsx
---

# Wire notebook suggested prompts

## Purpose

First consumer of the `SuggestedPrompts` contract. Exports 3 notebook-centric prompts from the notebook plugin's `plugin-root.tsx`.

## Files

- `packages/apps/notebook/src/plugin-root.tsx` — add `export const SuggestedPrompts: string[] = ["Summarize this notebook's datasources", "Suggest a query for my active datasource", "Explain the last error I saw"];` as a sibling to the existing `default` / `FlatRoot` / `resolveProjectContext` exports.

## Acceptance

- [ ] `SuggestedPrompts` exported from `packages/apps/notebook/src/plugin-root.tsx`.
- [ ] `pnpm --filter @guepard/notebook typecheck` passes.
- [ ] `registry.getSuggestedPrompts('notebook')` returns the 3 notebook prompts (via the mechanism added in task 001).

## Test plan

```
pnpm --filter @guepard/notebook typecheck
```

## Notes

- Sibling export position in the file is arbitrary; group near `HelpPages` if that export exists, otherwise near `FlatRoot`.
- No i18n wiring — plugin owns its own copy (matches spec §7.7: prompts aren't enumerated in the i18n key map).
