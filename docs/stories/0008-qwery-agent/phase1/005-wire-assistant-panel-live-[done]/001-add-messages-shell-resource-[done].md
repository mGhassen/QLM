---
story: ./story.md
status: done
layer: shell
files:
  - packages/shell-runtime/src/resources/messages.ts
  - packages/shell-runtime/src/client.ts
  - packages/shell-runtime/src/index.ts
---

# Add messages shell resource

## Purpose

Expose `useShell().messages.getByConversationSlug(slug)` so the panel/tab can load existing message history when bootstrapping a conversation.

## Files

- `packages/shell-runtime/src/resources/messages.ts` — **new**. `createMessagesResource(repository, queryClient)` returning `{ keys: { all, byConversationSlug(slug) }, getByConversationSlug, invalidate: { all, byConversationSlug } }`. Wraps `GetMessagesByConversationSlugService` from `@guepard/domain/services`.
- `packages/shell-runtime/src/client.ts` — add `messages: MessagesResource` to `ShellClient`, compose in `useMemo` passing `repositories.message` (already on `Repositories` type).
- `packages/shell-runtime/src/index.ts` — re-export `MessagesResource` type.

## Acceptance

- [x] `useShell().messages` is typed and returns `{ keys, getByConversationSlug, invalidate }`.
- [x] `getByConversationSlug(slug)` returns `MessageOutput[]` for an existing conversation. Service requires both `IMessageRepository` and `IConversationRepository`; both passed via `repositories.message` and `repositories.conversation`.
- [x] `pnpm typecheck` at root passes (46/46 turbo tasks).

## Test plan

```
pnpm typecheck
```

(Unit tests folded into story 010 — same rationale as the conversations resource.)

## Notes

- Verify the exact arg shape of `GetMessagesByConversationSlugService.execute(...)` — single string vs `{ conversationSlug }` object.
- Don't add pagination yet — keep the resource minimal; pagination lands when needed.
- Don't expose `create` / `update` / `delete` for messages — they're handled server-side by `/api/chat/:slug` and adding them now is YAGNI.
