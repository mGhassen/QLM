---
spec: docs/specs/0030-predictions-relml-phase1.md
spec_sections:
  - "#32-screen-by-screen"
  - "#41-layered-sequence"
  - "#75-presentation--feature-package-packagesfeaturespredictions"
  - "#76-shell-app-packagesappspredictions"
status: pending
started: null
finished: null
blocks: ["009"]
blocked_by: ["002", "005", "006"]
---

# build-agent-chat-panel

## Goal

Inside a snapshot, a user can switch to the **Ask agent** tab, type a question, and watch a streamed answer arrive token-by-token that references real tables and columns from the snapshot.

## Scope

**In scope**
- Feature components in `packages/features/predictions/src/`:
  - `prediction-agent-panel.tsx` — composer + message list + streaming state + retry on error.
  - `prediction-agent-message-list.tsx`.
  - `prediction-agent-composer.tsx`.
- `packages/apps/predictions/src/use-agent-stream.ts` — hook that accepts `(snapshotId, history) → { stream, append, isStreaming, error }`. Internally calls `shell.predictions.agent.stream(...)`.
- Empty-state suggestions per spec §3.2 (3 fixed prompts) shown on first open.
- Wire the **Ask agent** tab in the snapshot detail flat-root (story 007 stubbed it).
- Conversation lifecycle: lazily create one conversation per snapshot on first user message via `shell.predictions.agent.createConversation(snapshotId)`; reuse on subsequent messages within the same session.
- Storybook stories per new component (use a mock streaming source).

**Out of scope**
- i18n keys — story 009 (placeholder copy with TODO comments).
- Snapshot history listing — phase 1 does not surface it.

## Acceptance criteria

- [ ] Ask agent tab renders empty state with 3 suggestion chips on first open.
- [ ] Clicking a suggestion fills the composer; pressing Enter or Send starts a streamed response.
- [ ] Subsequent messages append to the same conversation.
- [ ] LLM provider errors render an inline destructive block with a Retry button; retry resends the last user message.
- [ ] No `console.error` spew during a normal happy-path session.
- [ ] `pnpm --filter @qlm/features-predictions storybook` shows the agent components.
- [ ] `pnpm typecheck && pnpm lint` are green.

## Tasks

Populated by `/start-story`.

## Demo / verification

```bash
pnpm dev
```

Open any snapshot → Ask agent tab → ask "Which tables join through user_id?" → confirm streaming response that names tables present in the snapshot.

## Questions surfaced

-

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
