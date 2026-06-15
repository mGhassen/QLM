---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - packages/features/qwery-agent/__tests__/chat-feedback.test.tsx
validation:
  kind: typecheck-only
---

# Add integration test for feedback wiring

Lock in task 003's wiring with a jsdom integration test. Same pattern as `chat-auth.test.tsx` from story 011 — mount `AssistantPanelBody` with a passthrough `<QweryAgentUI>` mock, trigger the `onSubmitFeedback` prop the body passes in, and assert the feedback-submit hook fires `POST /api/feedback` with the expected payload.

## Done when

- [ ] New file `packages/features/qwery-agent/__tests__/chat-feedback.test.tsx`.
- [ ] Mocks `@qlm/ui/agent-ui` to a passthrough that captures the `onSubmitFeedback` prop and calls it once on mount with a fake `(messageId, feedback)` pair.
- [ ] Mocks the HTTP client (`apiPost` — or whichever transport `useSubmitFeedback` uses) with a `vi.fn()` that resolves.
- [ ] Renders `<AssistantPanelBody />` inside a fresh `QueryClientProvider`, waits for the passthrough to fire `onSubmitFeedback`, then asserts:
  - The mocked HTTP call received `POST /api/feedback` (or the equivalent `apiPost('/feedback', …)`).
  - The payload includes `conversationSlug`, `messageId`, and the `feedback` blob from the prop call.
- [ ] A second test covers `<AgentTabBody conversationSlug="..." />` with the same assertions.
- [ ] `pnpm --filter @qlm/qwery-agent test __tests__/chat-feedback.test.tsx` passes.

## Notes

- Follow the exact mock shape `chat-auth.test.tsx` uses for `useShell()` — same stub conversation, same QueryClient fresh-per-test.
- Don't test the dialog UX (open / fill / cancel) — that's inside `<QweryAgentUI>` and covered by the Storybook + ui-smoke tasks. This test only asserts the callback wiring.
