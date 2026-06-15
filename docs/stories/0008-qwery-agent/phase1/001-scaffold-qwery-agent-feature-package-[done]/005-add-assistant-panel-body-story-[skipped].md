---
story: ./story.md
status: skipped
layer: features
files:
  - packages/features/qwery-agent/src/assistant-panel-body.stories.tsx
---

# Add assistant panel body story

## Purpose

Add a minimal Storybook CSF3 story for `AssistantPanelBody` so the component renders in isolation and serves as the phase-1 smoke verification before live wiring.

## Files

- `packages/features/qwery-agent/src/assistant-panel-body.stories.tsx` — **new**. Default meta + one story rendering `<AssistantPanelBody />` at the panel's natural width (≈360 px). Uses the repo's existing Storybook config; no new addons.

## Acceptance

- [ ] `pnpm --filter @guepard/qwery-agent typecheck` passes.
- [ ] Running Storybook (`pnpm --filter <storybook-host> storybook` or whatever entrypoint the repo uses) loads the story without runtime errors.
- [ ] The story shows header, placeholder thread / empty-state area, and prompt input in a narrow column.

## Test plan

```
pnpm --filter @guepard/qwery-agent typecheck
# Open Storybook and navigate to: Features / QweryAgent / AssistantPanelBody.
```

## Notes

- Mirror the shape of sibling feature-package stories (e.g. `packages/ui/src/guepard/ai/conversation-content.stories.tsx`) — don't invent a new convention.
- Wrap in a fixed-width div (360 px) so the story reflects how the component actually renders inside `RightSidebar`.
- No need to parameterize the story — a single `Default` export is enough for phase 1 smoke.

## Skipped because

Per user feedback during task 003, Storybook stories should be co-located with each component rather than batched into a separate trailing task. Tasks 002 and 003 shipped `assistant-panel-body.stories.tsx` and `agent-tab-body.stories.tsx` alongside their components, fully satisfying this task's acceptance. Skipping rather than deleting preserves the historical trace.
