---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/qwery-agent/src/assistant-panel-body.tsx
  - packages/features/qwery-agent/src/agent-tab-body.tsx
  - packages/features/qwery-agent/src/hooks/use-submit-feedback.ts
  - packages/ui/src/qlm/agent-ui.tsx
validation:
  kind: ui-smoke
  route: /prj/$projectSlug
  expect_console: empty
  expect_network_2xx:
    - /api/feedback
---

# Wire message feedback submission in the agent bodies

The `message-feedback-button` + `message-feedback-dialog` primitives already exist in `packages/ui/src/qlm/ai/`. `<QweryAgentUI>` already accepts an `onSubmitFeedback(messageId, feedback)` callback — it's used in qwery-enterprise's `agent-ui-wrapper.tsx`. In v3 neither `AssistantPanelBody` nor `AgentTabBody` passes the callback, so the thumbs never render on assistant messages. This task ports that wiring.

## Done when

- [ ] New hook `packages/features/qwery-agent/src/hooks/use-submit-feedback.ts` that returns a mutation calling `POST /api/feedback` with `{ conversationSlug, messageId, feedback }` via the existing HTTP client. Takes `conversationSlug` and optional `{ onSuccess, onError }` — mirror qwery-enterprise's hook if present, otherwise use `apiPost` via the shell.
- [ ] `AssistantPanelBody` uses `useSubmitFeedback(conversation.slug)` and passes an `onSubmitFeedback={(messageId, feedback) => submitFeedback.mutateAsync({ messageId, feedback })}` prop into `<QweryAgentUI>`.
- [ ] `AgentTabBody` does the same with `conversationSlug` (the prop).
- [ ] Successful submission shows a `toast.success(t('chat.feedback.success'))`, failure shows `toast.error(t('chat.feedback.error'))`. Add the two keys to `packages/i18n` alongside the existing `chat.*` namespace if they don't exist.
- [ ] `pnpm --filter @qlm/qwery-agent typecheck` passes.
- [ ] UI smoke (validator drives the flow): open panel, submit a prompt, wait for assistant reply, click thumbs-down on the assistant message, fill the dialog, submit. Asserts `POST /api/feedback` returns 2xx and the console is clean.

## Notes

- Do not add a shell-runtime resource for feedback — there's no reuse across apps in this phase. A local feature-package hook is the right granularity (YAGNI).
- Do not instantiate domain services here. `POST /api/feedback` is a plain HTTP call against the existing server route; no new entity / port / use case is needed.
- The feedback button appears only on assistant messages — that's owned by `<QweryAgentUI>` internals; we're just providing the callback.
