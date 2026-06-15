---
spec: docs/specs/0008-qwery-agent-phase1.md
spec_sections:
  - "#75-presentation--feature-package-packagesfeaturesqwery-agent"
  - "#41-layered-sequence-diagrams"
  - "#33-user-flows-happy-paths"
status: done
started: 2026-04-14
finished: 2026-04-14
blocks:
  - 007-mount-agent-shell-tab
  - 008-add-credits-banner-and-precheck
  - 009-add-suggested-prompts-plugin-contract
  - 010-add-qwery-agent-tests
blocked_by:
  - 001-scaffold-qwery-agent-feature-package
  - 003-add-conversations-shell-resource
---

# Wire assistant panel live

## Goal

Make `AssistantPanelBody` in `packages/features/qwery-agent` bootstrap the per-(user, project) default conversation via `useShell().conversations`, submit messages to `/api/chat/:slug`, stream responses, and persist history across reloads — fully replacing the mock.

## Scope

**In scope**

- On mount, `AssistantPanelBody` calls `useShell().conversations.getDefaultForProject()` to resolve or create the panel's conversation.
- Submitting from the prompt input calls `POST /api/chat/:slug` with `{ messages, model, datasources }`, where `datasources` is the current project's active datasource (where the shell exposes one) — auto-injected context as per spec §3.1.
- Streaming: consume the SSE response through the existing `conversation-content` primitives; tool calls render via `tool-calls-ui`.
- Persistence: refresh the panel; the conversation history is loaded from `/api/messages?conversation=<slug>` via the conversations resource's lazy fetch.
- Model selector (existing `model-selector.tsx`) wired to whatever default is already exposed by `agent-factory-sdk.getDefaultModel`.
- Empty state shows a placeholder suggestions list — NOT the plugin-contract system yet (that's story 009). Use a static default array for now.

**Out of scope** (forces honest slicing)

- CMD+L keybinding — story 006.
- "Open in new tab" action and the flat route — story 007.
- Credits banner / 402 handling — story 008.
- Plugin-contributed suggestions — story 009.

## Acceptance criteria

- [⚠] Opening the panel bootstraps a conversation — wired via `useShell().conversations.getDefaultForProject()`; service is idempotent. **Live runtime smoke pending: open a project → topbar assistant → confirm conversation appears.**
- [⚠] Streaming response on submit — handled by `<QweryAgentUI>` + `transportFactory(slug, model)` posting to `/api/chat/<slug>`. Live smoke pending.
- [⚠] Reload preserves history — `useShell().messages.getByConversationSlug()` + `convertMessages()` feed `initialMessages`. Live smoke pending.
- [⚠] Switching projects shows different conversation — query keys include `shell.projectId`; React Query refetches on change. Live smoke pending.
- [ ] Active datasource auto-injection — **deferred**: the shell context exposes `useShell().datasources` but no canonical "active datasource" — that's route-level state (e.g. notebook bound to a datasource). A route-aware auto-injection layer is needed before this acceptance item can be ticked. Tracked as a follow-up; logged in spec changelog.
- [x] `pnpm typecheck` passes; full monorepo green (46/46 turbo tasks). Required adding `@types/turndown` to `agent-factory-sdk` to unblock downstream typecheck for any package that walks into `agent-factory-sdk/src/tools/webfetch.ts`.

## Tasks

1. [001-add-messages-shell-resource](001-add-messages-shell-resource-[done].md) ✅
2. [002-add-message-converter-helper](002-add-message-converter-helper-[done].md) ✅
3. [003-extract-panel-header-component](003-extract-panel-header-component-[done].md) ✅
4. [004-wire-assistant-panel-to-agent-ui](004-wire-assistant-panel-to-agent-ui-[done].md) ✅

## Demo / verification

```bash
pnpm dev
# 1. Open any project → topbar assistant icon → see the bootstrapped conversation.
# 2. Type "Hello" → submit → assistant reply streams in.
# 3. Hard-refresh → re-open panel → previous messages still there.
# 4. Navigate to a different project → open panel → different conversation (or empty).
```

## Questions surfaced

- <bullet>

## Notes

- 002: ported `convertMessages` verbatim from qwery-enterprise. Added `@types/turndown` (npm-published) to `@guepard/agent-factory-sdk` to fix the implicit-any error that surfaces in any downstream package walking into agent-factory-sdk's `webfetch.ts`. The local `turndown.d.ts` shim inside agent-factory-sdk's own src is invisible to consumers; `@types/turndown` is the proper fix.
- 004: panel and tab bodies both delegate everything chat-related to `<QweryAgentUI>` (heavyweight component already exported from `@guepard/ui/agent-ui`). Storybook stories temporarily render only `<PanelHeader />` since the live bodies require both `<ShellAppProvider>` and `<QueryClientProvider>` — full mock harness is story 010's domain.
- 004: active-datasource auto-injection (spec §3.1) deferred — there's no shell-context concept of an "active datasource" today; making the panel route-aware so it can pick one up is its own concern, logged as deviation in spec changelog. Functional pre-req for story 008's billing pre-check is unaffected.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. **no** — active-datasource auto-injection (§3.1 / §3.3) deferred because the shell context has no concept of an "active datasource" today; logged in spec `## Changelog`. All other §3.3 / §4.1 / §7.5 flows match: `<QweryAgentUI>` composition mirrors qwery-enterprise's proven wrapper.
