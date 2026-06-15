---
story: ./story.md
status: done
layer: features
files:
  - packages/features/qwery-agent/src/assistant-panel-body.tsx
  - packages/features/qwery-agent/src/agent-tab-body.tsx
---

# Gate assistant bodies on balance

## Purpose

When `useBillingBalance()` reports `balance <= 0`, render `<CreditsBanner />` in place of `<QweryAgentUI>` so the user can't send messages when the server would return HTTP 402 anyway. Both the panel and the full-tab view get the same gate.

## Files

- `packages/features/qwery-agent/src/assistant-panel-body.tsx` — call `useBillingBalance()`; when `balance <= 0`, render banner inside the panel chrome instead of `<QweryAgentUI>`. Header stays visible.
- `packages/features/qwery-agent/src/agent-tab-body.tsx` — same gate, same banner.

## Acceptance

- [ ] Org with `balance === 0`: panel body renders `<CreditsBanner />` (no QweryAgentUI, no prompt input). Header with BotAvatar + "Qwery Agent" title still visible.
- [ ] Same for `/agent/$conversationSlug` tab.
- [ ] Org with `balance > 0`: original behaviour (conversation + streaming chat).
- [ ] Loading state for the balance query does **not** flicker the banner — while balance is `undefined`, treat it as permissive (show the conversation) to avoid a false-positive banner during initial load.
- [ ] `pnpm --filter @guepard/qwery-agent typecheck` passes.

## Test plan

```
pnpm --filter @guepard/qwery-agent typecheck
pnpm --filter web dev
# Test with a zero-balance org (or stub the endpoint): open panel → banner visible.
# Top up credits (or switch to a funded org): panel body reloads into conversation.
```

## Notes

- Gate logic inside each body: `const { data: billing } = useBillingBalance();` then `const isOutOfCredits = billing !== undefined && billing.balance <= 0;`. The `undefined` check protects the initial-load state.
- Banner gets `orgSlug={shell.orgSlug}`.
- Keep the existing `LoadingPlaceholder` for the conversation-loading state separate from the banner path.
