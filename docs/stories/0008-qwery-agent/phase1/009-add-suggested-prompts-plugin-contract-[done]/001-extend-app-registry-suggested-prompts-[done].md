---
story: ./story.md
status: done
layer: host
files:
  - apps/web/src/shell/app-registry.ts
---

# Extend app registry with suggested prompts

## Purpose

Add the `SuggestedPrompts` plugin-root sibling export to the registry, mirroring the existing `HelpPages` wiring from RFC 0005.

## Files

- `apps/web/src/shell/app-registry.ts` — add `SuggestedPrompts?: string[]` to `PluginRootModule`; add `suggestedPrompts?: string[]` to `PluginRegistryEntry`; copy the export in `buildEntries`; add a private `DEFAULT_SUGGESTED_PROMPTS` const (3 generic prompts); add method `getSuggestedPrompts(routeBase: string | null): string[]` returning plugin prompts or the default.

## Acceptance

- [ ] `registry.getSuggestedPrompts(null)` returns the 3 default prompts.
- [ ] `registry.getSuggestedPrompts('unknown-route')` returns the 3 default prompts.
- [ ] `pnpm --filter web typecheck` passes.

## Test plan

```
pnpm --filter web typecheck
```

## Notes

- Mirror the `helpPages` field placement — keep naming consistent (`suggestedPrompts` camelCase on entry, `SuggestedPrompts` PascalCase on plugin export).
- Keep the default list short (3 prompts) and generic enough for any route.
