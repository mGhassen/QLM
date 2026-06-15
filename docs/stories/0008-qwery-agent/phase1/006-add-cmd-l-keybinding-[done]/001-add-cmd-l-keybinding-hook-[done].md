---
story: ./story.md
status: done
layer: host
files:
  - apps/web/src/shell/use-assistant-keybinding.ts
  - apps/web/src/shell/project-shell-host.tsx
---

# Add CMD/CTRL + L keybinding hook

## Purpose

Register a global `keydown` listener inside `ProjectShellHost` that toggles `activePanel` between `'assistant'` and `null` on CMD/CTRL + L. Mirrors the proven sidebar.tsx pattern (CMD+B for sidebar collapse).

## Files

- `apps/web/src/shell/use-assistant-keybinding.ts` — **new**. Exports `useAssistantKeybinding(setActivePanel)` taking the React `Dispatch<SetStateAction<ActivePanel>>` setter. Registers `window.addEventListener('keydown', ...)` in a `useEffect`, removes on cleanup.
- `apps/web/src/shell/project-shell-host.tsx` — call `useAssistantKeybinding(setActivePanel)` next to the existing `useState<ActivePanel>(null)`.

## Acceptance

- [⚠] Pressing CMD+L on `/prj/*` toggles `activePanel === 'assistant'` ↔ `null`. **Live runtime smoke pending** — code path: `useAssistantKeybinding(setActivePanel)` mounted at line 330 of `project-shell-host.tsx`.
- [x] Browser default suppressed via `event.preventDefault()` inside the handler — only fires when our condition matches.
- [x] Hook never registers on `/org/*` or `/auth/*` — `ProjectShellHost` doesn't render there.
- [x] CodeMirror passthrough — handler bails (no `preventDefault`, no toggle) when `event.target.closest('[data-codemirror-root]')` returns truthy.
- [⚠] `pnpm --filter @qlm/qwery-agent typecheck` passes; my new file `apps/web/src/shell/use-assistant-keybinding.ts` compiles cleanly. Repo-wide `pnpm typecheck` fails on `apps/web` and `apps/server` because of an **unrelated** parallel-session change (added `userToken` and `jwtSigner` to the `Repositories` domain type but the factories haven't been updated yet — same pattern as the billing-customer cleanup that landed mid-session earlier). Will go green once the auth-work session updates the factories.

## Test plan

```
pnpm typecheck
pnpm dev
# In a /prj/<slug>/* route, press CMD+L: panel opens.
# Press CMD+L again: panel closes.
# Navigate to /org/<slug>: CMD+L falls through to the browser address bar.
```

## Notes

- Use `event.key.toLowerCase() === 'l'` to handle Caps Lock.
- Use the functional `setActivePanel((prev) => prev === 'assistant' ? null : 'assistant')` form — no `activePanel` dep needed in the effect.
- Focus-on-open is **deferred** (separate concern): reaching the textarea inside `<QweryAgentUI>` requires plumbing or a focus-broadcast event. Document in story notes.
