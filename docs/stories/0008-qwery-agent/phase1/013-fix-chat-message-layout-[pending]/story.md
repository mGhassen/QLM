---
spec: docs/specs/0008-qwery-agent-phase1.md
spec_sections:
  - "#32-screen-by-screen"
  - "#75-presentation--feature-package-packagesfeaturesqwery-agent"
status: pending
started: null
finished: null
blocks: []
blocked_by:
  - 012-polish-chat-conversation-ui
---

# Fix chat message layout

## Goal

Finish the chat-UI polish items deferred from story 012: shrink assistant prose to a comfortable reading size (keep code blocks monospace), right-align user message bubbles, and shrink the prompt-input font — all while preserving QLM's app-wide monospace aesthetic.

## Scope

**In scope**

- **Assistant prose size**: the rendered `<p>` / `<li>` / `<h*>` inside `<Streamdown>` (invoked by `MessageResponse` / `MessageContent` for assistant turns) should render at ~`text-sm` or `text-xs`, not `text-base`. Code blocks + inline code keep their current size.
- **User message right-alignment**: user bubbles should be flush to the right edge of the conversation column (not centered). The bubble retains `max-w-[80%]`-ish wrapping and `bg-muted/50 rounded-lg` treatment.
- **Prompt-input font size**: placeholder + typed text shrink to match the new assistant prose size for visual consistency.
- **Storybook refresh**: update `conversation-content.stories.tsx` + `chat-with-tool-calls.stories.tsx` so the new typography + alignment show up as the canonical visual fixtures.

**Out of scope**

- Flipping `--app-font-sans` globally — the monospace aesthetic is intentional; overrides must stay scoped to the chat surface.
- Restyling the feedback button, the model selector, or any other affordance inside the conversation area.
- Adding new spec sections, new endpoints, new entities, or any backend change.

## Acceptance criteria

- [ ] Assistant prose `<p>` elements in the conversation render at `font-size: 14px` (`text-sm`) or smaller, verified in DevTools computed styles. Code blocks + inline code remain `font-mono` and their current size.
- [ ] User message bubble: the outermost user-message wrapper is flush to the right edge of the conversation column (`justify-end` actually applies to the visible bubble, not the invisible wrapper), with `max-w-[80%]` wrapping intact.
- [ ] Prompt-input placeholder + typed text render at the same size as assistant prose.
- [ ] `pnpm --filter @qlm/ui typecheck` and `pnpm --filter @qlm/qwery-agent typecheck` pass.
- [ ] Existing qwery-agent tests (auth + feedback integration) remain green.
- [ ] Storybook visual smoke: `Design System/AI/Conversation Content / Text output (agent response)` and `Full (tasks + tool + sources)` render the new treatment cleanly; reviewer eyeballs them.
- [ ] Runtime smoke via `pnpm dev`: user bubble right-aligned, assistant prose not oversized, no console errors.

## Tasks

Populated by `/start-story`. Expected shape (3 tasks):

1. Fix assistant prose size — likely via passing a `components` prop to `<Streamdown>` inside `MessageResponse`, OR adding a scoped `[&_.prose_p]:text-sm` on `MessageContent` for assistant role. Needs DOM inspection first.
2. Fix user-message right-alignment — the real offender is somewhere in the `agent-ui.tsx` wrapper chain (`outer row → inner col → user-only flex-col`). Needs DOM inspection to find the wrapper that's neutralizing `justify-end`.
3. Storybook refresh on both affected stories.

## Demo / verification

```bash
pnpm --filter @qlm/storybook-config storybook
# Open Design System/AI/Conversation Content / Text output
# Confirm: assistant prose at text-sm, user bubble right-flush.

pnpm dev
# Sign in, open project, open panel (CMD+L), submit "hi".
# Confirm prose size, bubble alignment, no console errors.
```

## Questions surfaced

- <bullet, only when something unexpected came up during implementation>

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.

## Notes

- **Context from story 012**: three prior attempts to shrink prose via wrapper-level Tailwind (`text-xs` on `<Conversation>`, then on `MessageContent`, then on deeper nestings) all failed because Streamdown's internal prose rules win on specificity. User observed `font-size: 1rem` in DevTools regardless of wrapper class. Proper fix needs either (a) Streamdown `components` override, (b) scoped CSS selector targeting Streamdown's emitted classnames, or (c) an explicit `components.p` prop if Streamdown accepts it.
- **Context on alignment**: user-message wrapper chain in `agent-ui.tsx` lines 1507-1740 has multiple layers, and `w-full max-w-full min-w-0` on the `<Message>` override defeats `max-w-[80%]` from the primitive. Needs live DOM inspection (browser DevTools) to identify the layer that's actually laying out the bubble, not blind class-changing.
