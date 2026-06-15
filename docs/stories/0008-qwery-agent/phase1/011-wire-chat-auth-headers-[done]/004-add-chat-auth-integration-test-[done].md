---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - packages/features/qwery-agent/__tests__/chat-auth.test.tsx
validation:
  kind: typecheck-only
---

# Add integration test for chat auth header wiring

Lock in the fix with a jsdom integration test that renders `AssistantPanelBody`, lets the conversation query settle, and asserts the panel constructs `transportFactory(slug, model, { getHeaders })` where the resolved `getHeaders` yields `{ Authorization: 'Bearer <token>' }`.

The e2e alternative was dropped for this story — the existing `apps/e2e` harness has no project / credits / datasource POM, and building it is a separate story. This test covers the same regression at the feature layer, without Supabase / Mailpit / Vite.

## Done when

- [ ] New file `packages/features/qwery-agent/__tests__/chat-auth.test.tsx`.
- [ ] Mocks `@qlm/agent-factory-sdk` so `transportFactory` is a `vi.fn()` we can spy on.
- [ ] Mocks `@qlm/supabase/auth-headers` so `getAuthHeaders` resolves to `{ Authorization: 'Bearer test-token' }`.
- [ ] Mocks `@qlm/shell-runtime` so `useShell()` returns a minimal shell with a `conversations.getDefaultForProject` that resolves to a fake conversation.
- [ ] Mocks `@qlm/ui/agent-ui` to a passthrough component.
- [ ] Renders `<AssistantPanelBody />` inside a fresh `QueryClientProvider`, waits for the conversation to load, and asserts:
  - `transportFactory` was called with `(slug, model, { getHeaders: <function> })`.
  - Calling that `getHeaders()` resolves to `{ Authorization: 'Bearer test-token' }`.
- [ ] A second test covers `<AgentTabBody conversationSlug="..." />` with the same assertions.
- [ ] `pnpm --filter @qlm/qwery-agent typecheck` passes.
- [ ] `pnpm --filter @qlm/qwery-agent test __tests__/chat-auth.test.tsx` passes.

## Notes

- Keep the test focused on the wiring contract, not streaming behavior. The SDK-level unit test from task 001 already verifies that `{ getHeaders }` reaches `DefaultChatTransport.headers` — this test just proves the feature passes it.
- No need to render `<QweryAgentUI>` for real — a passthrough mock is enough and avoids bringing in heavy UI deps.
