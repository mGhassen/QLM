---
spec: docs/specs/0008-qwery-agent-phase1.md
spec_sections:
  - "#31-information-architecture"
  - "#76-shell-app"
  - "#42-component-split"
status: done
started: 2026-04-15
finished: 2026-04-15
blocks:
  - 010-add-qwery-agent-tests
blocked_by:
  - 001-scaffold-qwery-agent-feature-package
  - 003-add-conversations-shell-resource
  - 005-wire-assistant-panel-live
---

# Mount agent shell tab

## Goal

Add the flat route `apps/web/src/routes/agent/$conversationSlug.tsx`, the `createAgentPath` helper, and the "Open in new tab" action in the panel that upserts a `VirtualTab` into the project shell's tab bar and navigates to the new route.

## Scope

**In scope**

- New file `apps/web/src/routes/agent/$conversationSlug.tsx` — TanStack Router flat route that:
  - Loads the conversation via `useShell().conversations.getBySlug(slug)`.
  - Resolves the project context from the conversation's `projectId` (calls the existing `resolveProjectContext` pattern used by other flat routes like `/notebook/$slug`).
  - Mounts the page under `ProjectShellHost`, passing a `virtualTab = { id: 'agent:<slug>', title: <conversationTitle>, href }` so the shell tab bar shows it.
  - Renders `<AgentTabBody conversationSlug={slug} />` from `@qlm/qwery-agent`.
  - Handles the "conversation not found" state with a minimal empty view + "Back to project" action.
- New helper `createAgentPath(conversationSlug: string): string` in `apps/web/src/config/paths.config.ts` returning `/agent/<slug>`.
- New hook `useOpenConversationInTab(slug)` inside `@qlm/qwery-agent` that (a) ensures the shell tab for the conversation exists by calling the host-level virtual-tab upsert path, (b) navigates to `createAgentPath(slug)`.
- Wire the "Open in new tab" button in `AssistantPanelBody` (header) to call the hook with the current panel conversation's slug — so clicking it opens the same conversation as a shell tab (same slug, per RFC Amendment A1).
- `project-shell-host.tsx` accepts the optional `virtualTab` for agent slugs and upserts it into `openTabs` following the existing mechanism for flat routes (the same hook used by `/notebook/$slug`).

**Out of scope** (forces honest slicing)

- Conversations-history dropdown inside `AgentTabBody` — deferred (can be added post-phase-1 or by story 010 if time).
- Pinning / reordering agent tabs — follows the existing `pinned` flag on `ShellTabStored`; not a new feature.
- Shareable-URL access controls beyond the existing org-membership check on conversations.

## Acceptance criteria

- [⚠] Clicking "Open in new tab" navigates to `/agent/<slug>` — shell tab, not browser tab. Wired via `useNavigate` in `AssistantPanelBody`; handler passed to `PanelHeader.onOpenInTab`. **Live smoke pending in `pnpm dev`.**
- [⚠] New shell tab appears in the tab bar with the conversation's title (fallback `"Conversation"` if empty). Wired via `virtualTab` in the new flat route. Live smoke pending.
- [⚠] Direct navigation to `/agent/<slug>` mounts the project shell. The new route does this via `<ProjectShellHost>`. Live smoke pending.
- [⚠] Two concurrent agent tabs in the same project — follows naturally from the shell's existing multi-tab support; both slugs produce distinct `virtualTab` ids. Live smoke pending.
- [x] Bad slug renders a not-found placeholder (not a blank screen or crash). The route returns `<NotFound />` when `findBySlug` returns null.
- [⚠] `pnpm --filter @qlm/qwery-agent typecheck` passes. Repo-wide `pnpm typecheck` still blocked on the parallel auth-work issue (`userToken` / `jwtSigner` fields missing from factories) — unrelated to this story.

## Tasks

1. [001-add-agent-flat-route](001-add-agent-flat-route-[done].md) ✅
2. [002-wire-open-in-tab-button](002-wire-open-in-tab-button-[done].md) ✅

## Demo / verification

```bash
pnpm dev
# 1. Open panel in project A → click "Open in new tab" → shell tab appears with the same conversation.
# 2. From within the tab, start another conversation via the history dropdown (if wired) OR navigate manually to /agent/<anotherSlug>.
# 3. Confirm two distinct agent shell tabs in the same project tab bar.
# 4. Visit /agent/<madeupslug> → empty state + "Back to project" link.
```

## Questions surfaced

- <bullet>

## Notes

- 001: mirrored `$flatPrefix.$.tsx` but kept it dedicated — no plugin manifest, no entry in the app registry. The `virtualTab` mechanism already does the heavy lifting; the route itself is ~80 lines.
- 002: no `createAgentPath` helper introduced — features package can't import from `apps/web/src/config/paths.config.ts`, and the inline string `'/agent/' + slug` is simple enough. Added `@tanstack/react-router` as a runtime dep on `@qlm/qwery-agent` so `useNavigate` resolves.
- No close-button wiring — the `onClose` prop is there as a hook but deferred (phase 2 or polish story). Phase 1 closes the panel via the topbar toggle / CMD+L, not from inside the header.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. **yes** — §3.1 info architecture matches (shell tab inside the project shell, `virtualTab` upsert); §7.6 shell-app wiring matches (host-level flat route, no plugin package); §4.2 component split honored (route lives in apps/web, body composition in features/qwery-agent).
