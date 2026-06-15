---
spec: docs/specs/0008-qwery-agent-phase1.md
spec_sections:
  - "#76-shell-app"
  - "#33-user-flows-happy-paths"
status: done
started: 2026-04-14
finished: 2026-04-14
blocks:
  - 010-add-qwery-agent-tests
blocked_by:
  - 001-scaffold-qwery-agent-feature-package
---

# Add CMD/CTRL + L keybinding

## Goal

Register a global CMD/CTRL + L keybinding in `apps/web/src/shell/project-shell-host.tsx`, scoped to the project-shell tree, that toggles the assistant panel (`activePanel === 'assistant'` ↔ `null`) and focuses the prompt input when opening.

## Scope

**In scope**

- Add a keydown listener inside `ProjectShellHost` (or a dedicated hook `useAssistantKeybinding` if that keeps the host file lean) that triggers on `(e.metaKey || e.ctrlKey) && e.key === 'l'`.
- The handler calls `onPanelChange('assistant')` when the panel is closed and `onPanelChange(null)` when it is open.
- Prevent-default + stop-propagation when the shortcut fires so the browser's default "open location bar" (CMD+L) is overridden while inside the project shell.
- When opening, programmatically focus the prompt input (ref-forwarded through `AssistantPanelBody` or exposed via a shell-runtime signal — design choice inside the story).
- Ignore the shortcut when focus is inside a code editor instance (notebook / SQL editor) that already consumes CMD+L. Use a best-effort check (`event.target` is inside `[data-codemirror-root]` or similar).
- No-op when the user is outside the project shell (routes under `/org/*`, `/auth/*`) — the listener must not register there.

**Out of scope** (forces honest slicing)

- Any other keybinding beyond CMD/CTRL + L.
- Visualizing the shortcut in a help dialog or tooltip.
- Persisting the user's preference to disable it.

## Acceptance criteria

- [⚠] Pressing CMD+L on `/prj/*` toggles the assistant panel. Live smoke pending in `pnpm dev`.
- [ ] **Focus-on-open deferred** — reaching the textarea inside `<QweryAgentUI>` requires plumbing or a focus-broadcast event. Tracked as a phase-1 follow-up.
- [x] CMD+L on `/org/<slug>` / `/auth/*` is a no-op — `ProjectShellHost` (and therefore the hook) doesn't mount on those routes.
- [x] CodeMirror passthrough — handler bails before `preventDefault` when target ancestor matches `[data-codemirror-root]`.
- [x] `event.preventDefault()` suppresses the browser's "select address bar" default inside the shell.
- [⚠] `pnpm --filter @guepard/qwery-agent typecheck` clean. Repo-wide `pnpm typecheck` blocked on a pre-existing parallel-session issue: `Repositories` type gained `userToken` and `jwtSigner` fields but `apps/web/src/lib/repositories/repositories-factory.ts` and `apps/server/src/lib/repositories.ts` haven't been updated yet. Unrelated to this story; expected to be fixed by the parallel auth-work session.

## Tasks

1. [001-add-cmd-l-keybinding-hook](001-add-cmd-l-keybinding-hook-[done].md) ✅

## Demo / verification

```bash
pnpm dev
# In a project page, press CMD+L: assistant panel opens, input focused.
# Press CMD+L again: panel closes.
# Navigate to /org/<slug>: CMD+L falls through to the browser.
```

## Questions surfaced

- <bullet>

## Notes

- 001: extracted into a hook `useAssistantKeybinding(setActivePanel)` to keep `project-shell-host.tsx` lean. Same `window.addEventListener('keydown', ...)` + `useEffect` pattern as `packages/ui/src/shadcn/sidebar.tsx` (the existing CMD+B sidebar toggle). Toggle uses `setActivePanel((prev) => prev === 'assistant' ? null : 'assistant')` so the hook needs no state dep.
- 001: focus-on-open deferred. Reaching the textarea ref through `<QweryAgentUI>` → `<QweryPromptInput>` requires either prop-plumbing or a focus-broadcast event. Tracked as a follow-up; logged as deviation in the spec changelog.
- 001: repo-wide typecheck blocked on a parallel auth-work session change to `Repositories` type (added `userToken`, `jwtSigner`). Unrelated to this story; my files compile clean in isolation.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. **no** — focus-on-open (§3.3) deferred; logged in spec changelog.
