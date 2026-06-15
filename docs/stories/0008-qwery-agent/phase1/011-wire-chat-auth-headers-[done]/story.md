---
spec: docs/specs/0008-qwery-agent-phase1.md
spec_sections:
  - "#31-contracts-and-auto-injection"
  - "#75-presentation--feature-package-packagesfeaturesqwery-agent"
status: done
started: 2026-04-18
finished: 2026-04-18
blocks: []
blocked_by:
  - 005-wire-assistant-panel-live
---

# Wire chat transport auth headers

## Goal

Make the streaming `POST /api/chat/:slug` call carry the Supabase session bearer token so the server's RLS-scoped Supabase client can resolve the conversation — today it fails with a silent 404 because `DefaultChatTransport` posts unauthenticated.

## Scope

**In scope**

- Extend `packages/agent-factory-sdk/src/services/default-transport.ts` to accept `{ getHeaders?: () => Record<string, string> | Promise<Record<string, string>> }` and forward it as `DefaultChatTransport({ headers: options.getHeaders })`.
- Extend `packages/agent-factory-sdk/src/services/transport-factory.ts` to accept the same options and forward them to `defaultTransport`.
- Expose a `getAuthHeaders()` utility from `@qlm/supabase` that reads the current browser session and returns `{ Authorization: 'Bearer <token>' }` (or `{}` when anonymous). A feature package cannot import from `apps/web`, so the helper must live in `@qlm/supabase`.
- Wire `transportFactory(slug, model, { getHeaders: getAuthHeaders })` in `packages/features/qwery-agent/src/assistant-panel-body.tsx` and `agent-tab-body.tsx`.
- Unit-test the transport factory: asserts that `getHeaders` is plumbed through to `DefaultChatTransport`.
- Integration-test the chat-auth wiring at the feature layer (jsdom): assert `AssistantPanelBody` / `AgentTabBody` build the transport with `{ getHeaders: getAuthHeaders }` and the resolved headers carry the bearer. Full end-to-end coverage through Playwright is deferred — the existing `apps/e2e` harness lacks a project / credits / datasource POM and building it is out of this story's scope.

**Out of scope**

- Server-side auth behavior — already correct; the gap is purely client-side header propagation.
- Mid-stream 402 / payment-required handling — owned by story 008 follow-up (`QweryAgentUI.onPaymentRequired`).
- Any changes to RLS policies or the conversation schema.
- `handleMcpRequest` auth — different endpoint, different code path, out of scope.

## Acceptance criteria

- [x] `defaultTransport(api, { getHeaders })` forwards `getHeaders` to `DefaultChatTransport.headers`; existing `defaultTransport(api)` call sites keep working (param is optional).
- [x] `transportFactory(slug, model, { getHeaders })` forwards options; the two-arg signature keeps working.
- [x] `@qlm/supabase` exports `getAuthHeaders()` (new `./auth-headers` export).
- [x] `assistant-panel-body.tsx` and `agent-tab-body.tsx` construct the transport with `{ getHeaders: getAuthHeaders }`.
- [x] Unit test: transport factory passes a `getHeaders` fn that resolves to `{ Authorization: 'Bearer <token>' }` into `DefaultChatTransport`.
- [x] Integration test: `AssistantPanelBody` and `AgentTabBody` construct the chat transport with `{ getHeaders }`, and the resolved `getHeaders()` yields `{ Authorization: 'Bearer <token>' }`. (E2E deferred — the `apps/e2e` harness has no project POM yet; raising a standalone story for the full chat e2e once that harness exists.)
- [x] `pnpm typecheck` passes; no regressions in existing qwery-agent tests. Runtime-verified in `pnpm dev`: `POST /api/chat/4ttkA19O6Y 200 161ms` (same slug that returned 404 in the bug report).

## Tasks

1. [001-add-transport-factory-headers-support](001-add-transport-factory-headers-support-[done].md) ✅
2. [002-expose-get-auth-headers-from-supabase](002-expose-get-auth-headers-from-supabase-[done].md) ✅
3. [003-wire-auth-headers-in-qwery-agent-feature](003-wire-auth-headers-in-qwery-agent-feature-[done].md) ✅
4. [004-add-chat-auth-integration-test](004-add-chat-auth-integration-test-[done].md) ✅

## Demo / verification

```bash
pnpm dev
# 1. Sign in, open any project, open the assistant panel.
# 2. Submit "hi".
# 3. In the server logs, confirm:
#      POST /api/chat/<slug> 200 (streaming)
#    NOT:
#      POST /api/chat/<slug> 404
# 4. Hard-refresh, confirm the conversation history is preserved AND a second submit still streams.
pnpm --filter @qlm/qwery-agent test __tests__/chat-auth.test.tsx
```

## Questions surfaced

- During implementation, the monorepo `pnpm check` was red on `main` — `.gitignore` was silently swallowing `test-*.ts` source files (commit `a2b75d2`), which is why the integration / features-integrations fixtures looked "missing". Fixed on `main` separately (`ff685e7`) and this story rebased on top. Led to a proposed rule addition to `.claude/rules/spec-driven-dev.md`: `/start-story` should refuse when `main`'s `pnpm check` is red (stashed locally, to be committed to `main` independently).

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
