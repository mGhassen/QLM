---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/qwery-agent/src/_panel-header.tsx
  - packages/features/qwery-agent/src/agent-tab-body.tsx
validation:
  kind: typecheck-only
---

# Shrink panel header, drop it from the tab view

The current `PanelHeader` is ~80px tall with a big Qwery avatar + two rows of text (title + "Conversation" subtitle), which steals real estate from the conversation area. In the sidebar panel it should be ~32–36px; in the `/agent/$slug` tab view the shell tab bar already provides the conversation title, so the header is redundant and should be removed.

## Done when

- [ ] `_panel-header.tsx`: avatar down to `h-6 w-6` (or smaller), title + subtitle collapse to one row — `text-sm font-medium` title + muted trailing slug, vertical padding trimmed to `py-1.5`. Net header height ≤ 36px.
- [ ] Existing header actions (open-in-tab, close, model selector if any) still render and work at the smaller size.
- [ ] `agent-tab-body.tsx`: does not render `<PanelHeader />` at all — the shell tab bar already shows the conversation label.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm --filter @qlm/qwery-agent test` stays green — `chat-feedback.test.tsx` and `chat-auth.test.tsx` should not regress (both render the bodies; removing the header from the tab body may affect DOM assertions — adjust mocks if needed).

## Notes

- No Storybook changes yet — `agent-tab-body.stories.tsx` / `assistant-panel-body.stories.tsx` currently render only the `PanelHeader`, so they'll visibly change but not break. A separate story polish pass lives in task 002 (deferred in this story).
- Keep the agent panel header — the sidebar has no tab bar to anchor identity. Only the `/agent/$slug` tab view drops it.
