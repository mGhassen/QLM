---
story: ./story.md
status: done
layer: features
files:
  - packages/features/qwery-agent/src/assistant-panel-body.tsx
  - packages/features/qwery-agent/src/agent-tab-body.tsx
---

# Accept initial suggestions in panel body

## Purpose

Extend `AssistantPanelBody` with an `initialSuggestions?: string[]` prop and forward it to `<QweryAgentUI>`'s existing `initialSuggestions` prop. `AgentTabBody` deliberately does **not** accept plugin-contributed prompts — tab view is conversation-scoped, not route-scoped.

## Files

- `packages/features/qwery-agent/src/assistant-panel-body.tsx` — add `initialSuggestions?: string[]` to the component signature; forward to `<QweryAgentUI initialSuggestions={initialSuggestions} />`.
- `packages/features/qwery-agent/src/agent-tab-body.tsx` — add a short comment explaining that per-plugin prompts are out of scope here (tab view is conversation-scoped).

## Acceptance

- [ ] `AssistantPanelBody` accepts `initialSuggestions?: string[]`.
- [ ] Prop forwards to `<QweryAgentUI initialSuggestions={...} />` (existing component API).
- [ ] `AgentTabBody` unchanged in signature — no regression.
- [ ] `pnpm --filter @guepard/qwery-agent typecheck` passes.

## Test plan

```
pnpm --filter @guepard/qwery-agent typecheck
```

## Notes

- Default the prop to `undefined` (not `[]`) — lets `<QweryAgentUI>` use its own fallback behaviour when no prompts are set.
- Credit-banner gate from story 008 still takes precedence; when `isOutOfCredits` the banner hides everything including suggestions.
