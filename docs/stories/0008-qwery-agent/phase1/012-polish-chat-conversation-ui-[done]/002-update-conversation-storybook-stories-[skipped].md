---
story: ./story.md
status: skipped
layer: features
model: sonnet
files:
  - packages/ui/src/qlm/ai/conversation-content.stories.tsx
  - packages/ui/src/qlm/ai/chat-with-tool-calls.stories.tsx
validation:
  kind: typecheck-only
---

# Update conversation Storybook stories for the new typography + feedback

Refresh the Storybook fixtures so reviewers can visually verify task 001's typography pass and task 003's feedback-button wiring. The `conversation-content.stories.tsx` fixture should render a short conversation (one user message, one assistant message with markdown + bullet list) in the new bubble layout. The `chat-with-tool-calls.stories.tsx` fixture should keep the tool-call monospace rendering while the surrounding prose is sans-serif.

## Done when

- [ ] `conversation-content.stories.tsx` has one story that renders:
  - user: "What can Qwery Agent help me with?" — right-aligned bubble.
  - assistant: a markdown reply with a short paragraph and a 3-bullet list — left-aligned prose, avatar on the first message, sans-serif body.
  - The assistant message renders the feedback thumbs (once task 003 lands, the story should exercise them — pass a stub `onSubmitFeedback` that logs to console; this is just visual smoke).
- [ ] `chat-with-tool-calls.stories.tsx` keeps a tool-call block with monospace text inside, surrounding prose in sans-serif.
- [ ] Both stories render cleanly in `pnpm --filter @qlm/ui storybook` with no console errors.
- [ ] `pnpm --filter @qlm/ui typecheck` passes.

## Notes

- Keep the stubs minimal — real message objects only, don't bring in a full shell mock. Storybook should render the primitives in isolation.
- If the story needs a prop that doesn't exist yet (e.g. the `onSubmitFeedback` callback that task 003 will add), land the story update *after* task 003 — story ordering matters only if the prop surface changes.

## Skipped because

Depends on task 001's typography changes, which were skipped (Streamdown prose specificity prevented the wrapper-level fix). Storybook refresh will land with the proper typography fix in follow-up story `013-fix-chat-message-layout`.
