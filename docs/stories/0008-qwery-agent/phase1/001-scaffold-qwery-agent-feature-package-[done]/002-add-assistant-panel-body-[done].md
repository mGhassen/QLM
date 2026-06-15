---
story: ./story.md
status: done
layer: features
files:
  - packages/features/qwery-agent/src/assistant-panel-body.tsx
  - packages/features/qwery-agent/src/index.ts
---

# Add assistant panel body

## Purpose

Create the `AssistantPanelBody` component — a static, unwired composition of `@guepard/ui/ai` primitives that will later become the live in-panel conversation view in story 005.

## Files

- `packages/features/qwery-agent/src/assistant-panel-body.tsx` — **new**. Exports `AssistantPanelBody`. Header (Qwery avatar + title + model-selector placeholder + "Open in new tab" placeholder + close placeholder), thread area (empty-state placeholder), prompt input slot rendering `PromptInput` unwired.
- `packages/features/qwery-agent/src/index.ts` — **update**. Barrel re-export `AssistantPanelBody`.

## Acceptance

- [x] `AssistantPanelBody` exported from `@guepard/qwery-agent`.
- [x] Component renders statically with no `useShell()`, no API calls, no Suspense boundaries.
- [x] Composition reuses primitives from `@guepard/ui/ai` (`QweryPromptInput`, `QweryConversationContent`).
- [x] `pnpm --filter @guepard/qwery-agent typecheck` passes.

## Test plan

```
pnpm --filter @guepard/qwery-agent typecheck
```

Visual smoke will land in task 005 (Storybook); for now a typecheck is the gate.

## Notes

- Avoid i18n keys entirely in this task — plain English strings are fine; story 005 introduces `t(...)` wiring.
- Keep the file under ~120 lines; split into sub-components only if you cross that.
- Style must work in a ~360 px-wide column (the panel shape).
