---
story: ./story.md
status: done
layer: features
files:
  - packages/features/qwery-agent/src/assistant-panel-body.tsx
  - packages/features/qwery-agent/src/agent-tab-body.tsx
  - packages/features/qwery-agent/src/assistant-panel-body.stories.tsx
  - packages/features/qwery-agent/src/agent-tab-body.stories.tsx
---

# Wire assistant panel to agent UI

## Purpose

Replace `AssistantPanelBody` and `AgentTabBody` placeholders with live wrappers around `<QweryAgentUI>` — bootstrapping the conversation, loading messages, building the streaming transport.

## Files

- `packages/features/qwery-agent/src/assistant-panel-body.tsx` — **rewrite**. Compose:
  1. `useShell()` for project + user context.
  2. `useQuery` on `shell.conversations.getDefaultForProject()` → conversation.
  3. `useQuery` on `shell.messages.getByConversationSlug(conversation.slug)` → raw messages.
  4. `transport = useMemo(() => (model) => transportFactory(conversation.slug, model), [conversation?.slug])`.
  5. Render `<PanelHeader />` then `<QweryAgentUI initialMessages={convertMessages(rawMessages)} transport={transport} models={SUPPORTED_MODELS} conversationSlug={conversation.slug} ...optional datasource props />`.
  6. Loading skeleton while conversation is unresolved.
- `packages/features/qwery-agent/src/agent-tab-body.tsx` — **rewrite**. Same composition but:
  - Uses `props.conversationSlug` (already on signature) → `useQuery` on `shell.conversations.getBySlug(slug)`.
  - Full-width container.
- `packages/features/qwery-agent/src/assistant-panel-body.stories.tsx` and `agent-tab-body.stories.tsx` — **update**. Provide a minimal mock `ShellAppProvider` decorator so the stories still render. If mocking is too invasive, mark them with `parameters: { docs: { disable: true } }` and add a comment noting that visual smoke happens via `pnpm dev` until story 010's test harness lands.

## Acceptance

- [⚠] Opening the panel in a project bootstraps a conversation — code path verified (`useShell().conversations.getDefaultForProject()` called on mount, idempotent service guarantees same conversation on second open). **Live runtime smoke pending user verification via `pnpm dev`.**
- [⚠] Submitting a message streams a response — handled by `<QweryAgentUI>` + `transportFactory`. Live smoke pending.
- [⚠] Reloading the browser preserves prior conversation — handled by `useShell().messages.getByConversationSlug()` + `convertMessages()` feeding `initialMessages`. Live smoke pending.
- [⚠] Switching projects shows a different conversation — `useQuery` keys include `shell.projectId`; React Query refetches when project changes. Live smoke pending.
- [ ] Active datasource auto-injection — **deferred to a follow-up tweak**: `<QweryAgentUI>` accepts `selectedDatasources`, but the panel currently doesn't pass an active-datasource id. Spec §3.1 calls for it; minimal additional code path. Track as a follow-up to land before story 005 closes if time, otherwise note in story finish.
- [x] `pnpm typecheck` passes; full monorepo green (46/46 turbo tasks). Required adding `@types/turndown` to `agent-factory-sdk` to unblock downstream typecheck (qwery-agent + apps/web both walk into agent-factory-sdk's `webfetch.ts`). Storybook stories for both bodies temporarily render only `<PanelHeader />` since live bodies require `<ShellAppProvider>` + `<QueryClientProvider>` (full mock harness lands in story 010).

## Test plan

```
pnpm typecheck
pnpm dev
# Walk the four steps in story.md's Demo / verification section.
```

## Notes

- Don't add the "Open in new tab" handler in this task — story 007 owns it; keep the button disabled.
- Don't add credits banner / 402 handling here — story 008.
- Don't add `SuggestedPrompts` plugin discovery — story 009.
