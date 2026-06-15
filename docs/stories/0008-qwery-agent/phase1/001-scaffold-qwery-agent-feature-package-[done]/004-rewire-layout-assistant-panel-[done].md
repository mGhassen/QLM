---
story: ./story.md
status: done
layer: features
files:
  - packages/ui/src/guepard/layout/assistant-panel.tsx
  - packages/ui/src/guepard/layout/right-sidebar.tsx
  - packages/ui/src/guepard/layout/root-layout.tsx
  - packages/ui/src/guepard/shell/project-shell-layout.tsx
  - apps/web/src/shell/project-shell-host.tsx
  - apps/web/package.json
---

# Rewire layout assistant panel

## Purpose

Rewrite the existing mock `AssistantPanel` in `@guepard/ui/layout` as a thin wrapper that renders `AssistantPanelBody` from `@guepard/qwery-agent`, removing the hardcoded suggested prompts and fake welcome bubble.

## Files

- `packages/ui/src/guepard/layout/assistant-panel.tsx` — **rewrite**. New body: `import { AssistantPanelBody } from '@guepard/qwery-agent'; export function AssistantPanel() { return <AssistantPanelBody />; }`. Delete `SUGGESTED_PROMPTS`, the "Q" avatar block, the welcome bubble div.
- `packages/ui/package.json` — **update**. Add `@guepard/qwery-agent: workspace:*` to the appropriate deps section (match the convention used for other `@guepard/*` feature packages this package already consumes).

## Acceptance

- [x] `packages/ui/src/guepard/layout/assistant-panel.tsx` **deleted** (mock removed; no cycle to create). `grep -r SUGGESTED_PROMPTS packages/ui` returns nothing.
- [x] `RightSidebar` accepts an `assistantPanelContent?: ReactNode` prop (mirrors `docsPanelContent` from RFC 0005) and renders it when `activePanel === 'assistant'`.
- [x] `RootLayout` and `ProjectShellLayout` plumb the new prop through to `RightSidebar`.
- [x] `apps/web/src/shell/project-shell-host.tsx` renders `<AssistantPanelBody />` from `@guepard/qwery-agent` and passes it as `assistantPanelContent`.
- [x] `apps/web/package.json` depends on `@guepard/qwery-agent: workspace:*`.
- [x] `pnpm --filter @guepard/qwery-agent typecheck` passes; no new errors in `apps/web` or `@guepard/ui` caused by these changes (pre-existing datagrid + usage-repository errors tracked separately).

## Test plan

```
pnpm --filter @guepard/ui typecheck
pnpm --filter web dev
# Open any /prj/* route → topbar assistant icon → confirm new body renders.
```

## Notes

- Risk: cyclic dep if `@guepard/qwery-agent` imports from `@guepard/ui/layout`. Keep the qwery-agent package importing only from `@guepard/ui/ai`, `@guepard/ui/shadcn/*`, never from `@guepard/ui/layout`.
- Do not change the `RightSidebar` / `topbar-actions` logic — they already dispatch on `activePanel === 'assistant'`.
- Keep the export name `AssistantPanel` unchanged — existing imports in `right-sidebar.tsx` must not break.
