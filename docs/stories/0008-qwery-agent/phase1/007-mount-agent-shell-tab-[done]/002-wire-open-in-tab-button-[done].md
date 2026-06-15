---
story: ./story.md
status: done
layer: features
files:
  - packages/features/qwery-agent/src/_panel-header.tsx
  - packages/features/qwery-agent/src/assistant-panel-body.tsx
---

# Wire open-in-tab button

## Purpose

Enable the panel's "Open in new tab" button: when clicked, navigate to `/agent/<conversation-slug>`. The shell tab bar will upsert the agent tab automatically via the virtualTab mechanism (see task 001).

## Files

- `packages/features/qwery-agent/src/_panel-header.tsx` — extend props to `{ showOpenInTab?: boolean; showClose?: boolean; onOpenInTab?: () => void; onClose?: () => void }`. Enable each button only when its callback is defined; wire as onClick handler.
- `packages/features/qwery-agent/src/assistant-panel-body.tsx` — import `useNavigate` from `@tanstack/react-router`; after the conversation is loaded, build `onOpenInTab = () => navigate({ to: '/agent/' + conversation.slug })` and pass through to `<PanelHeader />`.

## Acceptance

- [ ] With no `onOpenInTab` prop, `PanelHeader`'s button stays `disabled` (current behaviour preserved).
- [ ] With `onOpenInTab` defined, button is enabled and fires the handler on click.
- [ ] In `AssistantPanelBody`, clicking the button navigates to `/agent/<slug>`; the flat route mounts (task 001); the agent tab appears in the shell tab bar.
- [ ] `pnpm typecheck` passes.

## Test plan

```
pnpm --filter @guepard/qwery-agent typecheck
pnpm --filter web dev
# 1. Open a project → topbar Qwery icon → panel opens with a live conversation.
# 2. Click the "Open in new tab" icon in the header.
# 3. URL changes to /agent/<slug>; shell tab bar shows a new tab with the conversation's title.
```

## Notes

- Don't add a `close` handler in this task — `onClose` is part of a broader "close panel from inside" UX that isn't in phase 1's critical path. Keep the close button `disabled` until a story explicitly wires it.
- The `AgentTabBody` variant already passes `showOpenInTab={false}`; it won't be affected.
- Keep the path construction inline (`'/agent/' + slug`) — no new helper. Feature packages shouldn't import from `apps/web/src/config/paths.config.ts`.
