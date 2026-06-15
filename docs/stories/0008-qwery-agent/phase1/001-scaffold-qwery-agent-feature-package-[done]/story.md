---
spec: docs/specs/0008-qwery-agent-phase1.md
spec_sections:
  - "#75-presentation--feature-package-packagesfeaturesqwery-agent"
  - "#42-component-split"
status: done
started: 2026-04-14
finished: 2026-04-14
blocks:
  - 005-wire-assistant-panel-live
  - 006-add-cmd-l-keybinding
  - 007-mount-agent-shell-tab
  - 009-add-suggested-prompts-plugin-contract
blocked_by: []
---

# Scaffold qwery-agent feature package

## Goal

Create a new `packages/features/qwery-agent` package with empty `AssistantPanelBody` and `AgentTabBody` components, and rewrite `packages/ui/src/qlm/layout/assistant-panel.tsx` as a thin wrapper that delegates to `AssistantPanelBody`.

## Scope

**In scope**

- New package `packages/features/qwery-agent` with standard layout (`package.json`, `tsconfig.json`, `src/index.ts`).
- `AssistantPanelBody` — presentational shell that renders a header (Qwery avatar, title, model selector placeholder, "Open in new tab" placeholder, close button), a thread area (placeholder `ConversationContent` wiring), and a prompt input slot (existing `prompt-input.tsx`). No data wiring yet — static / unwired primitives so it renders in Storybook.
- `AgentTabBody` — full-width sibling component with the same inner composition but scaled for the tab view. Accepts a `conversationSlug` prop even if unused for now.
- Barrel export from `src/index.ts`.
- Rewrite `packages/ui/src/qlm/layout/assistant-panel.tsx` as a thin wrapper that renders `<AssistantPanelBody />` and nothing else. Delete the hardcoded `SUGGESTED_PROMPTS` array, the placeholder "Q" avatar mock, and the fake welcome bubble.
- Register the new feature package in the root `pnpm-workspace.yaml` / `package.json` catalog if the workspace requires it.

**Out of scope** (forces honest slicing)

- Wiring `useShell().conversations` — story 005.
- CMD+L keybinding — story 006.
- Flat route and virtual tab upsert — story 007.
- Credits banner and pre-check — story 008.
- `SuggestedPrompts` plugin contract — story 009.

## Acceptance criteria

- [x] `packages/features/qwery-agent` exists with `package.json`, `tsconfig.json`, `src/index.ts`; `pnpm install` leaves the workspace clean.
- [x] `AssistantPanelBody` and `AgentTabBody` exported from `@qlm/qwery-agent`, each rendering a static, unwired composition of `packages/ui/src/qlm/ai/*` primitives (shared via private `_panel-shell.tsx`; branded `BotAvatar` header).
- [x] `packages/ui/src/qlm/layout/assistant-panel.tsx` **deleted** (corrected from "rewrite as wrapper" to avoid the ui→features dep cycle; host now injects `assistantPanelContent` prop following the RFC 0005 docs-panel pattern — see Notes bullet 3 and the deviation explanation below).
- [x] `pnpm typecheck` passes across the monorepo (46/46 turbo tasks green).
- [x] Storybook stories co-located for both `AssistantPanelBody` and `AgentTabBody` (task 005 `[skipped]` as superseded).

## Tasks

1. [001-scaffold-feature-package](001-scaffold-feature-package-[done].md) ✅
2. [002-add-assistant-panel-body](002-add-assistant-panel-body-[done].md) ✅
3. [003-add-agent-tab-body](003-add-agent-tab-body-[done].md) ✅
4. [004-rewire-layout-assistant-panel](004-rewire-layout-assistant-panel-[done].md) ✅
5. [005-add-assistant-panel-body-story](005-add-assistant-panel-body-story-[skipped].md) ⏭ (superseded by co-located stories in task 003)

## Demo / verification

```bash
pnpm --filter @qlm/qwery-agent typecheck
pnpm --filter web dev
# Open the project shell → topbar assistant icon → panel shows the new static body (no hardcoded prompts).
```

## Questions surfaced

- <bullet, only when something unexpected came up during implementation>

## Notes

- 002: had to patch `packages/ui/src/ai-elements/reasoning.tsx` (drop the props spread into `<Streamdown>`) to unblock `tsc --noEmit` in any downstream package that imports `@qlm/ui/ai`. Pre-existing baseline bug since initial commit; hit `@qlm/notebook` too. Follow-up: 2 remaining type errors in `packages/ui/src/qlm/datagrid/datagrid.stories.tsx` (out of qwery-agent import path but break `@qlm/ui` standalone typecheck).
- 003: stories co-located with each component (`*.stories.tsx` sibling) instead of batched into task 005; `BotAvatar` from `@qlm/ui/bot-avatar` (already ported from qwery-core) replaces the placeholder lucide `<Bot />`. Task 005 is redundant — marked `[skipped]`.
- 004: corrected the approach mid-task: deleted `assistant-panel.tsx` entirely rather than rewriting it as a ui→features wrapper (would have reversed hexagonal dep arrow). Instead `RightSidebar` now accepts `assistantPanelContent?: ReactNode`, mirroring `docsPanelContent` (RFC 0005 pattern); the host in `apps/web` injects `<AssistantPanelBody />`. No package cycle; dep arrow stays clean.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. **no** — deviation on §7.6 (adjacent section): `assistant-panel.tsx` deleted rather than rewritten; host injects the body via `RightSidebar` prop to avoid ui→features cycle.
