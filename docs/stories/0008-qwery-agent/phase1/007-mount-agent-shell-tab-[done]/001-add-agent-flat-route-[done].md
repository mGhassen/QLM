---
story: ./story.md
status: done
layer: host
files:
  - apps/web/src/routes/agent/$conversationSlug.tsx
---

# Add agent flat route

## Purpose

Add a TanStack file route at `/agent/$conversationSlug` that mounts `<ProjectShellHost>` with a virtual tab for the conversation and renders `<AgentTabBody>` as content. Follows the pattern from `apps/web/src/routes/$flatPrefix.$.tsx` (the generic plugin-app flat-route catch-all) but dedicated — no plugin manifest needed.

## Files

- `apps/web/src/routes/agent/$conversationSlug.tsx` — **new**. Exports `Route` via `createFileRoute('/agent/$conversationSlug')`. Component:
  - `useParams` for slug; `useWorkspace()` for repositories.
  - `useQuery` chain: conversation by slug → project by id → organization by id.
  - Loading spinner while any query is fetching; not-found placeholder if conversation missing.
  - On success, render `<ProjectShellHost>` with `activeTabId = 'agent:<slug>'`, `virtualTab = { id, title: conversation.title || 'Conversation', href: '/agent/<slug>' }`, children = `<AgentTabBody conversationSlug={slug} />`.

## Acceptance

- [ ] Navigating to `/agent/<existing-slug>` mounts the project shell and shows the agent tab in the shell tab bar.
- [ ] The tab's title matches the conversation's title (fallback `"Conversation"` if empty).
- [ ] Navigating to `/agent/<bad-slug>` shows a not-found placeholder (not a blank screen or crash).
- [ ] The conversation's messages load and stream correctly inside `<AgentTabBody>` (already built in story 005).
- [ ] `pnpm typecheck` passes — `routeTree.gen.ts` regenerates automatically when `pnpm --filter web dev` is run; typecheck after one dev-run.

## Test plan

```
pnpm --filter web dev   # Regenerates routeTree.gen.ts for the new route.
# Stop dev. Then:
pnpm typecheck
# Then in another session, navigate to /agent/<a-real-conversation-slug>.
```

## Notes

- Use `useWorkspace().repositories.conversation.findBySlug(slug)` — raw HTTP outside the shell since `useShell()` requires `ProjectShellHost` which isn't mounted until after this data loads.
- Mirror `$flatPrefix.$.tsx`'s loading/error UI (Loader2 spinner) so the visual is consistent with other flat routes.
- The route file defines its own path; no helper needed.
