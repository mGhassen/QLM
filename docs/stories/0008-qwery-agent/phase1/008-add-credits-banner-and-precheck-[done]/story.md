---
spec: docs/specs/0008-qwery-agent-phase1.md
spec_sections:
  - "#1-resolved-open-questions"
  - "#34-error-and-edge-case-behaviour"
status: done
started: 2026-04-15
finished: 2026-04-16
blocks:
  - 010-add-qwery-agent-tests
blocked_by:
  - 003-add-conversations-shell-resource
  - 005-wire-assistant-panel-live
---

# Add credits banner and pre-check

## Goal

Render an "Add credits" banner in place of the prompt input — across both the panel and the `/agent/$slug` shell tab — when `GET /api/billing/balance` reports zero, and surface the rare mid-stream HTTP 402 case as an in-conversation error bubble.

## Scope

**In scope**

- New component `CreditsBanner` inside `@qlm/qwery-agent` (or reused from an existing shared one if present) rendering title, short description, and a CTA that links to the billing top-up page (reuse an existing `createOrgBillingPath(...)` helper if it exists; otherwise open the org billing route).
- Pre-check on submit: before posting to `/api/chat/:slug`, `AssistantPanelBody` and `AgentTabBody` call `useShell().billing.getBalance()` and:
  - If `balance <= 0` → replace the prompt input with `<CreditsBanner />` and disable submit.
  - If `balance > 0` → proceed to submit.
- Mid-stream HTTP 402 handling: when the streaming response from `/chat/:slug` terminates with a 402 status (or a known billing-depleted error payload), render an inline error bubble in the thread with a shortened "Credits depleted — top up to continue" message, then swap the prompt input for the banner for subsequent turns.
- Both surfaces (panel and agent tab) use the same banner — no divergence.
- i18n keys for the banner under `chat.credits.*` and for the mid-stream error under `chat.errors.mid_stream_failure`, added to every existing locale file.

**Out of scope** (forces honest slicing)

- Changes to the billing endpoints or credits pricing.
- Server-side HTTP 402 behaviour (already exists in `chat.ts`).
- Any UX for "insufficient credits during tool execution" beyond the mid-stream error (that's a later-phase concern).

## Acceptance criteria

- [⚠] Org with `balance === 0` sees the banner **in place of** the full agent body (panel + tab). Deviation from "disabled submit alongside thread": QweryAgentUI doesn't expose a "disable input only" prop. Swapping the whole body is the phase-1 compromise; logged in spec changelog.
- [⚠] Balance recovers (> 0): the React Query hook's 30s `staleTime` + natural refetch-on-focus restores the conversation view without a reload. Live smoke pending.
- [ ] **Mid-stream 402 handling deferred.** QweryAgentUI doesn't expose `onError` or similar, so catching a 402 mid-generation requires a `QweryAgentUIProps.onPaymentRequired?` addition that belongs to a follow-up story. Server-side HTTP 402 continues to be the source of truth.
- [x] All new user-facing strings go through `t('credits.X')` in the `chat` i18n namespace — no hardcoded English.
- [⚠] `pnpm --filter @qlm/qwery-agent typecheck` clean. Repo-wide typecheck still blocked on the parallel auth-work session (`userToken` / `jwtSigner` factories) — unrelated to this story.

## Tasks

1. [001-add-use-billing-balance-hook](001-add-use-billing-balance-hook-[done].md) ✅
2. [002-add-credits-banner-component](002-add-credits-banner-component-[done].md) ✅
3. [003-gate-assistant-bodies-on-balance](003-gate-assistant-bodies-on-balance-[done].md) ✅

## Demo / verification

```bash
pnpm dev
# 1. Use an org whose balance is zero (seed it via the test fixture) → open panel → see banner + disabled submit.
# 2. Top up credits (or manually set balance > 0) → banner gone, submit enabled.
# 3. To simulate mid-stream depletion: stub the server to return 402 after the first chunk → confirm an inline error bubble appears.
```

## Questions surfaced

- <bullet>

## Notes

- 001: feature-local `useBillingBalance()` hook hits the existing `GET /api/billing/status?orgSlug=...` endpoint directly — matches qwery-enterprise's pattern (no shell-runtime billing resource, no new server endpoint). 30-second `staleTime` keeps the query lightweight.
- 002/003: banner rendered in place of the whole agent body (not just the prompt input) because `QweryAgentUI` bundles thread + input and does not expose a "disable input" prop. Logged as deviation in spec changelog; a proper "thread visible + disabled input" requires API changes to `QweryAgentUI`.
- 003: mid-stream 402 handling also deferred — `QweryAgentUI` doesn't expose `onError` / a payment-required callback. Server remains the source of truth (HTTP 402 on `/api/chat/:slug`); a follow-up story will add the callback wiring when `QweryAgentUI`'s surface is extended.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. **no** — banner swaps the whole body (not just the input) and mid-stream 402 handling deferred. Both deviations logged in spec changelog.
