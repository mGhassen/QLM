---
story: ./story.md
status: done
layer: features
files:
  - packages/features/qwery-agent/src/_panel-header.tsx
  - packages/features/qwery-agent/src/_panel-shell.tsx
---

# Extract panel header component

## Purpose

Pull the header (BotAvatar + title + ExternalLink/X buttons) out of `_panel-shell.tsx` into a reusable `_panel-header.tsx` so `AssistantPanelBody` and `AgentTabBody` can render it above `<QweryAgentUI>` without inheriting the placeholder body/footer that's about to be replaced.

## Files

- `packages/features/qwery-agent/src/_panel-header.tsx` — **new**. Exports `PanelHeader({ showOpenInTab?: boolean; showClose?: boolean })`. Lifts the header JSX from `_panel-shell.tsx`. Buttons stay disabled (story 007 wires them).
- `packages/features/qwery-agent/src/_panel-shell.tsx` — simplify or delete. After the extraction, the file's only remaining content is the placeholder body/footer, which task 004 throws away. Delete the file once `assistant-panel-body.tsx` and `agent-tab-body.tsx` no longer reference it.

## Acceptance

- [x] `PanelHeader` is the only export of `_panel-header.tsx`.
- [⚠] `_panel-shell.tsx` retained as a thin placeholder that delegates the header to `<PanelHeader />` (still imported by `assistant-panel-body.tsx` / `agent-tab-body.tsx`). Task 004 deletes `_panel-shell.tsx` when the bodies are rewritten to render `<QweryAgentUI>` directly.
- [x] `pnpm typecheck` passes.

## Test plan

```
pnpm typecheck
grep -rn "_panel-shell" packages/features/qwery-agent/src || echo "clean"
```

## Notes

- Keep the underscore prefix (`_panel-header.tsx`) — signals private to the package.
- Don't touch the BotAvatar / lucide imports — keep them on the new file.
- Don't add new behaviour (e.g. real Open-in-tab handler) — that's strictly story 007's domain.
