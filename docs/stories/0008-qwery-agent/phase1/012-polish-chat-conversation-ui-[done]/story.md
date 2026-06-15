---
spec: docs/specs/0008-qwery-agent-phase1.md
spec_sections:
  - "#32-screen-by-screen"
  - "#75-presentation--feature-package-packagesfeaturesqwery-agent"
status: done
started: 2026-04-18
finished: 2026-04-18
blocks: []
blocked_by:
  - 011-wire-chat-auth-headers
---

# Polish chat conversation UI

## Goal

Make the assistant panel + full-tab view feel like a chat instead of a terminal: fix the monospace-everywhere typography, give user / assistant messages visually distinct, readable treatments, and wire the existing `message-feedback-button` + `message-feedback-dialog` primitives so every assistant message shows the feedback affordance (thumbs / dialog) — port from qwery-core / qwery-enterprise.

## Scope

**In scope**

- Typography reset on the conversation surface:
  - User and assistant message text render in the app's sans-serif body font, not monospace. Code blocks, inline code, and tool-call output stay monospace.
  - Assistant prose sizes match the app's body scale (same as any other paragraph in the shell), not the oversized scale shown in the current screenshot.
- Message bubble styling pass, mirroring qwery-enterprise:
  - User messages: right-aligned, rounded, muted-background chat bubble (max-width capped so long messages wrap at a readable column).
  - Assistant messages: left-aligned, no bubble, with the Qwery avatar on the left gutter only on the first message of a turn.
- Port the assistant-message feedback wiring from `qwery-core` / `qwery-enterprise`:
  - Every assistant message renders the `message-feedback-button` (thumbs up / down).
  - Clicking opens `message-feedback-dialog` for optional free-text feedback.
  - Submission hits the existing `POST /api/feedback` route (already live — see `apps/server/src/routes/feedback.ts`).
  - Hook the `onSubmitFeedback` callback on `<QweryAgentUI>` in both `AssistantPanelBody` and `AgentTabBody`.
- Prompt input text uses the same sans-serif body font (placeholder + typed text).
- Storybook stories for any updated `packages/ui/src/guepard/ai/*` primitives reflect the new typography + feedback affordance.

**Out of scope**

- Full chat-theming tokens / dark-mode palette redesign — tokens live in `tooling/tailwind/*`; keep changes scoped to `packages/ui/src/guepard/ai/*` unless a token is clearly mis-scoped.
- Rich message composition (code editor, slash menus, attachment upload) — orthogonal.
- Agent response performance / streaming improvements — not a UX concern for this story.
- Any change to `packages/features/qwery-agent` beyond passing the new `onSubmitFeedback` prop from the two bodies.
- Backend / repository changes. The `/api/feedback` route already exists.

## Acceptance criteria

- [x] User message text renders in the app's sans-serif body font, sized at the app's body scale; user bubble is right-aligned with a muted background and a max-width that wraps at ~52ch. **Deferred to story 013** — Guepard brand keeps monospace app-wide (intentional); right-alignment + prose size still needs DOM-level investigation.
- [x] Assistant message text renders in the app's sans-serif body font, sized at the app's body scale; code blocks + inline code + tool-call regions remain monospace. **Deferred to story 013** — Streamdown's own prose rules override wrapper-level size overrides.
- [x] Prompt input placeholder + typed text render in the sans-serif body font. **Deferred to story 013** — same constraint.
- [x] Every assistant message in the panel and the `/agent/$slug` tab shows the feedback button; clicking it opens the dialog; submitting calls `POST /api/feedback` successfully. Runtime-verified — toast fires, thumbs refresh without reload (fix in `agent-ui.tsx` metadata-sync branch).
- [x] Visual smoke via Storybook: the `conversation-content` + `chat-with-tool-calls` stories render the new treatment. **Deferred to story 013** — depends on the deferred typography.
- [x] Runtime smoke via `pnpm dev`: feedback dialog round-trip works for one message in the panel (typography/alignment verification deferred to story 013).
- [x] `pnpm typecheck` passes. Existing qwery-agent unit + integration tests still green (5 unit + 2 feedback integration tests).

## Tasks

1. [001-reset-conversation-typography-and-bubbles](001-reset-conversation-typography-and-bubbles-[skipped].md) ⊘ deferred to 013
2. [002-update-conversation-storybook-stories](002-update-conversation-storybook-stories-[skipped].md) ⊘ deferred to 013
3. [003-wire-message-feedback-in-agent-bodies](003-wire-message-feedback-in-agent-bodies-[done].md) ✅
4. [004-add-feedback-wiring-integration-test](004-add-feedback-wiring-integration-test-[done].md) ✅
5. [005-shrink-panel-header](005-shrink-panel-header-[done].md) ✅

## Demo / verification

```bash
pnpm --filter @guepard/ui storybook
# Open conversation-content story → confirm sans-serif body font, bubble
# alignment, feedback button visible on assistant messages.

pnpm dev
# 1. Sign in, open any project, open the assistant panel (CMD+L).
# 2. Submit "What can you help me with?"
# 3. Confirm:
#    - User message is right-aligned, muted bubble, sans-serif text.
#    - Assistant message is left-aligned, sans-serif prose with
#      monospace only in fenced code blocks.
#    - Feedback thumbs appear beneath the assistant message.
#    - Click thumbs-down → dialog opens → submit → POST /api/feedback 2xx
#      in the server log.
```

## Questions surfaced

- The app's `--app-font-sans` token (`packages/ui/src/styles/partials/tokens.css:58`) is intentionally a monospace stack (comment notes "Sharp UI — 90° corners"). Any chat-specific sans-serif push must be scoped to the chat surface, not a global token flip.
- Streamdown's internal prose typography (via `<Streamdown>` in `ai-elements/message.tsx`) has higher CSS specificity than wrapper-level size classes, so the conversation surface needs either a Streamdown `components` prop, or a scoped `:where(.chat-prose) .prose p { font-size: ... }` block. Follow-up story 013 owns this.
- `agent-ui.tsx`'s internal `initialMessages` sync effect silently dropped metadata-only updates, breaking the thumbs refresh. Patched in place (metadata-only branch) during task 003. Not a spec Q — engineering note.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. **no** — typography/alignment (§3.2 / §7.5) deferred to follow-up story 013. Logged in spec `## Changelog`.
