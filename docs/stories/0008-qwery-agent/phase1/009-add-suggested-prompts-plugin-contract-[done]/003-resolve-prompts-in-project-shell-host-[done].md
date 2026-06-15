---
story: ./story.md
status: done
layer: host
files:
  - apps/web/src/shell/project-shell-host.tsx
---

# Resolve prompts in project shell host

## Purpose

In the host, compute the active route's suggested prompts and pass them as a prop on `<AssistantPanelBody />` when constructing the `assistantPanelContent` injected into `<ProjectShellLayout>`.

## Files

- `apps/web/src/shell/project-shell-host.tsx` — derive `const suggestedPrompts = registry.getSuggestedPrompts(activeRouteBase);` where `activeRouteBase` already exists (used for `<ActiveHelpPage>`). Pass `<AssistantPanelBody initialSuggestions={suggestedPrompts} />` into `assistantPanelContent`.

## Acceptance

- [ ] Host passes `initialSuggestions` to `<AssistantPanelBody />` (new prop added in task 004).
- [ ] On a `/prj/<slug>/notebook` route the prop receives the 3 notebook prompts; on any other route it receives the shell default.
- [ ] `pnpm --filter web typecheck` passes.

## Test plan

```
pnpm --filter web typecheck
pnpm --filter web dev
# Open a notebook route → open panel → see notebook prompts in the empty state.
# Open a non-notebook route → open panel → see shell default prompts.
```

## Notes

- `activeRouteBase` is already computed in the host for the docs panel. Reuse as-is.
- Place the resolution near the existing `<ActiveHelpPage>` definition for code locality.
