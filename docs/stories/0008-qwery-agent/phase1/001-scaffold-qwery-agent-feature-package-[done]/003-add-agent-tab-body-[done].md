---
story: ./story.md
status: done
layer: features
files:
  - packages/features/qwery-agent/src/agent-tab-body.tsx
  - packages/features/qwery-agent/src/agent-tab-body.stories.tsx
  - packages/features/qwery-agent/src/assistant-panel-body.tsx
  - packages/features/qwery-agent/src/assistant-panel-body.stories.tsx
  - packages/features/qwery-agent/src/_panel-shell.tsx
  - packages/features/qwery-agent/src/index.ts
---

# Add agent tab body

## Purpose

Create the `AgentTabBody` component — the full-width sibling of `AssistantPanelBody` used by the `/agent/$conversationSlug` shell tab (wired in story 007).

## Files

- `packages/features/qwery-agent/src/agent-tab-body.tsx` — **new**. Exports `AgentTabBody` with `Readonly<{ conversationSlug: string }>` props. Full-width layout (`flex h-full w-full flex-col`). Same inner composition as the panel body, scaled up.
- `packages/features/qwery-agent/src/index.ts` — **update**. Barrel re-export `AgentTabBody`.

## Acceptance

- [x] `AgentTabBody` exported from `@guepard/qwery-agent`.
- [x] Props `Readonly<{ conversationSlug: string }>` accepted (slug unused in this task; story 007 wires it).
- [x] No data fetching — static composition only.
- [x] `pnpm --filter @guepard/qwery-agent typecheck` passes.
- [x] Storybook stories co-located for both `AssistantPanelBody` and `AgentTabBody`; shared composition extracted into private `_panel-shell.tsx` (~90 lines of duplication avoided).

## Test plan

```
pnpm --filter @guepard/qwery-agent typecheck
```

## Notes

- Extract any layout shared between `AssistantPanelBody` and `AgentTabBody` into a private `_panel-shell.tsx` only if the duplication is > 20 lines.
- Reuse the same `@guepard/ui/ai` primitives — diverge only in outer layout / width.
- Don't add conversation-history dropdowns here; story 007 / 010 will add them.
