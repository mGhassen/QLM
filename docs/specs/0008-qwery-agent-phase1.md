# Spec — Qwery Agent in the project shell (phase 1)

| Field        | Value                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Status       | Draft                                                                                              |
| Author       | Hani Chalouati                                                                                     |
| Created      | 2026-04-14                                                                                         |
| Implements   | [RFC 0008 — Qwery Agent in the project shell](../rfcs/0008-qwery-agent.md)                         |
| Target phase | Phase 1 — productize the existing agent stack as a user-facing copilot in the project shell        |
| Stories      | <placeholder — `/spec-to-stories` fills this>                                                      |

This document is the implementation spec for RFC 0008. The RFC establishes the *why* and *shape*; this spec defines the *what* and *how*: resolved open questions, exact data shapes, API contracts, functional flows, file-by-file work items, and a verification plan.

Scope is strict to phase 1. New agent tools, RAG over docs, personal API tokens, mobile layouts, team-shared conversations, and voice I/O are each pinned to later phases and do not appear here.

---

## 1. Resolved open questions

| # | Question                                          | Resolution for phase 1                                                                                                                                                                                                                                            |
| - | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Conversation slug generation scheme                | UUID v4 primary id paired with a 10-character Sqids-encoded alphanumeric slug, matching the repo-wide pattern used by projects, datasources, and notebooks (see `shorten-id` utility). URL-safe, unguessable, collision-free.                                      |
| 2 | "Open in new tab" behavior on panel conversations  | Same slug, same conversation. Clicking the action upserts a **virtual shell tab** for `/agent/<panel-conversation-slug>` in the current project's tab bar and focuses it — *not* a new browser tab/window. The panel and the shell tab are two views onto one thread; no forking, no copying. See RFC Amendment A1. |
| 3 | Suggested-prompts scoping                          | Plugin-root sibling export `SuggestedPrompts: string[]`, discovered by the existing Vite-glob app registry — mirrors RFC 0005's `HelpPages` contract. Shell falls back to a small default list when the active plugin does not export any.                       |
| 4 | Billing UX when credits hit zero                   | Client-side balance pre-check on submit disables the prompt input and surfaces an "Add credits" banner; server-side HTTP 402 remains the source of truth; rare mid-stream depletion is surfaced as an in-conversation error bubble, same treatment on both surfaces. |

---

## 2. User stories

- As a **user in the project shell**, I can open the right-side assistant panel and have a live conversation with Qwery Agent — messages stream from the server in real time, replacing the current hardcoded mock.
- As a **user**, I can press **CMD/CTRL + L** from anywhere inside the project shell to toggle the assistant panel, and the prompt input receives focus on open.
- As a **user**, when I open the panel in project A I see *my* conversation for project A; switching to project B shows a distinct conversation scoped to B.
- As a **user**, I can click **"Open in new tab"** inside the panel and the conversation opens as a **shell tab** in the current project's tab bar (route `/agent/$conversationSlug` mounted under the project shell), keeping the same conversation thread and the panel's contents.
- As a **user**, I can open several Qwery Agent conversations as **distinct shell tabs within the same project**, switching between them like notebooks — each persists independently, all share the same project context.
- As a **user**, the agent already knows which project (and active datasource where applicable) I am working in — I don't have to restate context every turn.
- As a **billing-gated user**, if my org has no credits the panel and the `/agent/$slug` shell-tab view both show an "Add credits" banner in place of the prompt input, and submit is disabled until credits are topped up.

---

## 3. Functional flow

### 3.1 Information architecture

Qwery Agent has two co-existing surfaces, both **inside the project shell** — nothing renders chrome-less:

- **Right-side assistant panel** — reuses RFC 0005's `ActivePanel = 'assistant'` slot in `RightSidebar`. Holds exactly one conversation per (user, project), bootstrapped on first open and persisted thereafter. Toggled by the topbar button or **CMD/CTRL + L**.
- **`/agent/$conversationSlug` route, rendered as a shell tab** — mounted under the project shell (same sidebar, topbar, and tab bar). Each conversation slug is a distinct shell tab; the shell's existing `VirtualTab` mechanism (see `apps/web/src/shell/project-shell-host.tsx`) upserts a tab for each open conversation, persisted per-project in `sessionStorage` under `guepard:project-tabs:<projectId>`.

Multiple concurrent conversations in the same project appear as multiple shell tabs, alongside notebooks, datasource views, and any other contextual tabs. The sibling documentation panel (RFC 0005) is orthogonal — it coexists in the same `ActivePanel` union and does not interact with agent state.

### 3.2 Screen-by-screen

*Placeholder — author fills.* One subsection per screen.

- **`AssistantPanel` (rewrite)** — header (Qwery avatar, conversation title, model selector, "Open in new tab" button, close button), suggestions empty state, thread view, prompt input, credits banner variant.
- **`/agent/$conversationSlug` shell-tab view** — full-width content area inside the project shell. Same thread view + prompt input as the panel, scaled to full width. No separate chrome; the project-shell sidebar, topbar, and tab bar remain visible.
- **Credits banner (shared component)** — renders inside either surface in place of the prompt input; CTA links to billing.
- **Shell tab bar entry** — a new tab labeled with the conversation's title (auto-generated from the first message or a server-derived summary), closable like any other tab, pinnable optionally.

### 3.3 User flows (happy paths)

*Placeholder — author fills.* Numbered steps for:

1. First-time panel open in a project → default conversation is bootstrapped via `POST /conversations` and rendered.
2. CMD/CTRL + L toggle inside the project shell.
3. "Open in new tab" from the panel → `VirtualTab` upserted into `openTabs` for `/agent/$slug` → navigate to the route → panel stays open with the same conversation.
4. Opening a second conversation as a shell tab (e.g. from a conversations-history dropdown or a fresh `/agent/$slug2` navigation) → two distinct shell tabs live in the same project simultaneously.

### 3.4 Error and edge-case behaviour

*Placeholder.* Cover:

- Org with zero credits — both surfaces.
- Mid-stream depletion.
- Network loss during streaming.
- Conversation not found (bad slug in URL).
- CMD+L pressed outside the project shell (org pages, auth) — must be a no-op.

---

## 4. Technical flow

### 4.1 Layered sequence diagrams

*Placeholder — author fills.* One per primary operation:

- **Panel submit** → UI (`AssistantPanel`) → shell-runtime (conversation resource) → `POST /chat/:slug` → agent-factory-sdk → streaming SSE back → `conversation-content` re-renders.
- **CMD+L keybinding** → global listener mounted at project-shell level → checks current route is under `/prj/*` → calls `onPanelChange('assistant')` / `null` → `RightSidebar` re-renders.
- **"Open in new tab"** → panel button → resolves current conversation slug → host `upsertVirtualTab({ id: 'agent:<slug>', title, href: '/agent/<slug>' })` → `navigate(href)` → `project-shell-host` shows the tab as active.
- **Second conversation bootstrap** → user navigates to `/agent/<otherSlug>` (from conversations dropdown) → `project-shell-host` receives a new `virtualTab` prop → upserts into `openTabs` → both conversations now visible in the tab bar.

### 4.2 Component split

*Placeholder — author fills.* Decide and document what lives where:

- `packages/features/qwery-agent` (tentative) — presentation: panel body (`AssistantPanelBody`) and full-tab body (`AgentTabBody`), both composing `packages/ui/src/guepard/ai/*` primitives.
- Routing — `apps/web/src/routes/agent/$conversationSlug.tsx` (flat route under the project shell via `resolveProjectContext`). No standalone `packages/apps/qwery-agent` plugin package in phase 1 — the route is a host-level flat route, not a plugin nav item.
- Shell wiring — `apps/web/src/shell/project-shell-host.tsx` gains: (a) CMD+L keybinding registration, (b) logic to upsert an agent `VirtualTab` when on `/agent/$slug`, (c) conversation-to-title resolution for the tab label.
- Panel replacement — `packages/ui/src/guepard/layout/assistant-panel.tsx` becomes a thin wrapper that delegates to `AssistantPanelBody` from the feature package.
- Reuse — everything under `packages/ui/src/guepard/ai/*` is consumed as-is; no rewrites in phase 1.

---

## 5. API contracts

### 5.1 Data shapes

*Placeholder.* Typescript-shaped definitions for:

- Chat request body (existing — `{ messages: UIMessage[], model?: string, datasources?: string[], trigger?: 'submit-message' | 'regenerate-message' }`) — document what phase 1 sends.
- Conversation DTO (existing — document the shape used by the panel and page).
- Message DTO (existing).
- Balance check DTO (new or existing — confirm).

### 5.2 Endpoints

*Placeholder.* Table of:

- `POST /api/chat/:slug` — existing. Document phase-1 contract.
- `GET /api/conversations` — existing.
- `POST /api/conversations` — existing. Used when the panel bootstraps a new conversation for a project.
- `GET /api/conversations/:slug` — existing.
- `GET /api/messages?conversation=:slug` — existing.
- Balance check — confirm path (likely under `/api/billing/`).

No new endpoints expected in phase 1. If any are needed, document here.

### 5.3 Rate limiting, pagination, caching

*Placeholder.* Rate limits on `/chat/:slug`. Messages pagination (cursor vs page). Conversations list pagination. TanStack Query caching keys and invalidations.

---

## 6. Data model

### 6.1 Schema

*Placeholder.* RFC notes "Schema was already migrated under apps/web/supabase/schemas". Document the tables already in place (`conversations`, `messages`, any agent metadata tables) — no new migrations expected in phase 1. Call out if any ALTER is needed to support the new UX (unlikely).

### 6.2 Config / payload contracts

*Placeholder.* Any `jsonb` columns (message parts, tool call payloads) — document their schema.

### 6.3 Secrets contract

*Placeholder.* Confirm no new secrets are introduced in phase 1 (session cookie only, existing LLM provider keys live on the server).

---

## 7. File-by-file work items

Grouped by hexagonal layer, top-down. Each subsection lists concrete files and the change each one makes. `/spec-to-stories` reads this section to derive stories.

### 7.1 Domain (`packages/domain`)

**No changes.** The domain layer is already in place:

- Entities: `packages/domain/src/entities/ai/conversation.type.ts`, `message.type.ts`, `agent.type.ts`, `agent-session.type.ts`, `prompt.type.ts`, `tool.type.ts`, `usage.type.ts` — all present.
- Repository ports: `packages/domain/src/repositories/ai/conversation-repository.port.ts`, `message-repository.port.ts` — present.
- Use cases: `packages/domain/src/services/conversation/{create,delete,get,get-conversations,get-conversations-by-project-id,update}-conversation.usecase.ts` — all 6 present.

If a gap is discovered during Stage B or D (e.g. a missing `get-default-conversation-by-project-and-user` use case for the panel bootstrap), add it here; otherwise this section stays empty.

### 7.2 Adapters (`packages/repositories/*` and `apps/web/src/lib/repositories`)

**Minimal changes.** The adapters already exist:

- Supabase adapter: `packages/repositories/supabase/src/conversation.repository.ts`, `message.repository.ts`.
- HTTP adapter: `apps/web/src/lib/repositories/conversation.repository.ts`, `messages.respository.ts` *(note the typo in the filename)*.

Phase-1 changes:

- **Rename** `apps/web/src/lib/repositories/messages.respository.ts` → `message.repository.ts`. Update all imports (likely 1–3 call sites in repositories-factory and route loaders). Keep the class name; only the filename and imports change.
- **(Conditional)** If the panel bootstrap needs a "find default conversation for (user, project)" query and the existing adapters don't expose it, add the method symmetrically to both adapters.

### 7.3 Shell runtime (`packages/shell-runtime`)

**New resource + context wiring.**

- **New file**: `packages/shell-runtime/src/resources/conversations.ts` — namespaced API for the panel and tab:
  - `list()` — conversations scoped to the active project.
  - `getBySlug(slug)` — fetch a single conversation.
  - `getDefaultForProject()` — returns-or-creates the per-(user, project) default conversation used by the panel.
  - `create({ projectId, title? })` — create a fresh conversation.
  - `update(slug, patch)` — rename, archive, etc.
  - `delete(slug)` — remove a conversation.
  - `invalidate.list()` / `.bySlug(slug)` — React Query invalidators.
- **Shell client composition**: wire the new resource into `packages/shell-runtime/src/shell.ts` (or equivalent composer) so `useShell().conversations` is available alongside `notebooks`, `datasources`, etc.
- **Billing balance helper**: add a thin `useShell().billing.getBalance()` wrapper (or equivalent) if it doesn't already exist — used by the client-side credits pre-check from §1 row 4. Verify first; if already exposed, skip.

### 7.4 Server (`apps/server`)

**Verification-only expected.** The endpoints already exist:

- `POST /api/chat/:slug` — `apps/server/src/routes/chat.ts`.
- `GET /api/conversations`, `POST /api/conversations`, `GET /api/conversations/:slug` — `apps/server/src/routes/conversations.ts`.
- `GET /api/messages?conversation=:slug` — `apps/server/src/routes/messages.ts`.

Phase-1 verification checklist:

- Confirm each endpoint returns the shape the new `conversations` shell-runtime resource expects; adjust the resource (client) to match the server, not the other way around.
- Confirm the balance endpoint used by the client pre-check; if missing, add a minimal `GET /api/billing/balance` handler that reads `organizationRepository.getBillingData()` (already used inside `chat.ts`).
- No new business logic, no new tables, no schema migrations.

### 7.5 Presentation — feature package (`packages/features/qwery-agent`)

**New package.** Created with the standard `packages/features/*` layout (package.json, tsconfig.json, src/index.ts). Exposes two composition components that wrap `packages/ui/src/guepard/ai/*` primitives:

- `AssistantPanelBody` — renders the in-panel conversation view:
  - Header: Qwery avatar, conversation title, model selector, "Open in new tab" button, close button.
  - Body: `ConversationContent` with streaming; suggestions empty state when no messages; prompt input pinned at the bottom.
  - Credits banner variant (renders in place of prompt input when balance ≤ 0).
  - Consumes `useShell().conversations.getDefaultForProject()` for bootstrap.
- `AgentTabBody` — renders the full-width shell-tab view:
  - Same conversation and prompt components, scaled to full width.
  - Props-driven `conversationSlug`; fetches via `useShell().conversations.getBySlug(slug)`.
  - Conversations-history dropdown in the header to jump between the user's project-scoped conversations.
- `useOpenConversationInTab(slug)` — hook that, given a conversation slug, upserts a `VirtualTab` into the project shell's tab bar and navigates to `/agent/<slug>`. Encapsulates the shell-tab integration.

### 7.6 Shell app

**No plugin package created.** The `/agent/$conversationSlug` route is a host-level flat route, not a plugin nav item. Rationale: agent conversations don't belong in the per-app nav (they're not bound to a single app); the flat-route pattern (like notebooks) is the right shape.

Host changes instead:

- **New route file**: `apps/web/src/routes/agent/$conversationSlug.tsx` — flat route (TanStack Router file-based). Uses `resolveProjectContext` to resolve the project from the conversation's `projectId`, mounts under `ProjectShellHost`, passes a `virtualTab = { id: 'agent:<slug>', title: <conversationTitle>, href }` so the shell tab bar shows it. Renders `<AgentTabBody conversationSlug={slug} />` from the feature package.
- **`apps/web/src/config/paths.config.ts`** — add `createAgentPath(conversationSlug: string)` helper (returns `/agent/<slug>`), consumed by the "Open in new tab" button and the conversations-history dropdown.
- **`apps/web/src/shell/project-shell-host.tsx`**:
  - Register the global CMD/CTRL + L keybinding (scoped to the project-shell tree only, no-op on `/org/*` and `/auth/*`). Toggles `activePanel === 'assistant'`. Focuses the prompt input on open.
  - Accept the optional `virtualTab` for agent slugs and upsert into `openTabs` (mechanism already exists for flat routes).
- **`apps/web/src/lib/repositories-factory.ts`** — update the import for the renamed `message.repository.ts` file.

### 7.7 i18n (`apps/web/src/lib/i18n/locales/<locale>`)

**Extend `chat.json`** in every locale (en, and whichever others already have a `chat.json`). New keys, grouped:

- `chat.panel.title`, `chat.panel.subtitle`, `chat.panel.empty_state`, `chat.panel.suggestions_fallback_1..3`, `chat.panel.open_in_tab_button`, `chat.panel.close_button_aria`.
- `chat.tab.default_title`, `chat.tab.fallback_title`, `chat.tab.history_dropdown_label`, `chat.tab.history_empty`.
- `chat.credits.banner_title`, `chat.credits.banner_description`, `chat.credits.cta`.
- `chat.errors.mid_stream_failure`, `chat.errors.conversation_not_found`, `chat.errors.network_lost`, `chat.errors.cmd_l_unavailable_here` (silent in prod; dev-visible only).

No new locale file; existing `chat.json` namespace is extended. Full list of new keys to be enumerated verbatim in §11 before Stage E begins.

---

## 8. Permissions and RLS

*Placeholder.* Phase 1 is expected to reuse the existing org-membership RLS on `conversations` and `messages` tables (no new policies, no new permission enum values). Confirm during design and document the existing policies verbatim for reviewer sign-off.

---

## 9. Security checklist

*Placeholder.* Expand RFC §7 into a tickable list:

- [ ] Session-cookie-only auth on every phase-1 surface (no API-token path).
- [ ] Client-side balance pre-check is advisory; server HTTP 402 remains authoritative.
- [ ] No new tool side-effects introduced (phase 1 ships the existing tool registry as-is).
- [ ] CMD+L keybinding does not fire inside form fields / code editors (scope the listener).
- [ ] Conversation slugs are unguessable (Sqids over UUID, 10 chars alphanumeric).
- [ ] Cross-org access impossible by construction (request-scoped `getRepositories`).
- [ ] Prompt-injection risk reviewed — surface is limited to existing tools.

---

## 10. Verification plan

### 10.1 Static checks

*Placeholder.* `pnpm typecheck`, `pnpm lint`, `pnpm format:fix`, `pnpm build`.

### 10.2 Unit tests

*Placeholder.* Target packages: `packages/features/qwery-agent` (component behavior), `packages/shell-runtime` (conversation bootstrap), server route handlers where changed.

### 10.3 Integration tests

*Placeholder.* Chat route happy path + 402 gate, conversation bootstrap on panel open, persistence across page reload.

### 10.4 End-to-end (Playwright)

*Placeholder.* Key journeys:

- Open panel → send a prompt → assistant message streams → refresh → conversation persists.
- CMD+L toggle → prompt input focused.
- "Open in new tab" → shell tab upserted in the project tab bar → same conversation visible in the tab.
- Open a second conversation → two shell tabs live concurrently in the same project, independent state.
- Org with zero credits → banner shown on both surfaces → submit disabled.

### 10.5 Manual smoke

*Placeholder.* Step-by-step in `pnpm dev` proving each user story from §2.

---

## 11. i18n key map

*Placeholder.* Flat list of every new key, grouped by UI area:

- `qwery-agent.panel.*` — header, subtitle, empty-state, suggestions-fallback.
- `qwery-agent.tab.*` — shell-tab view labels (default title, fallback title, empty state, conversations-history dropdown).
- `qwery-agent.credits.*` — banner title, description, CTA.
- `qwery-agent.errors.*` — mid-stream failure, conversation not found, network loss.

---

## 12. Implementation sequencing

Strict sequential: A → B → C → D → E. Each stage must clear its gates before the next starts; one `[wip]` story at a time. Each bullet is one sentence and becomes a verb-first story folder under `docs/stories/0008-qwery-agent/phase1/`.

**Stage A — types and UI scaffolding**

- Scaffold `packages/features/qwery-agent` with package.json, tsconfig, src/index.ts, and empty `AssistantPanelBody` + `AgentTabBody` components that render static placeholders but wire the real `packages/ui/src/guepard/ai/*` primitives.
- Rewrite `packages/ui/src/guepard/layout/assistant-panel.tsx` as a thin wrapper that delegates to `AssistantPanelBody`; delete the hardcoded suggested-prompts mock and placeholder welcome bubble.

**Stage B — data and domain**

- Rename `apps/web/src/lib/repositories/messages.respository.ts` → `message.repository.ts`, update all imports (including `repositories-factory.ts`).
- Add the `conversations` resource at `packages/shell-runtime/src/resources/conversations.ts` with `list`, `getBySlug`, `getDefaultForProject`, `create`, `update`, `delete`, and React Query invalidators; compose it into the shell client so `useShell().conversations` is available.

**Stage C — server**

- Verify the existing `POST /api/chat/:slug`, `POST|GET /api/conversations`, `GET /api/messages` contracts match what the new shell-runtime resource expects; adjust the resource (client) to match the server.
- Add `GET /api/billing/balance` if missing (thin handler reusing `organizationRepository.getBillingData`) so the client-side credits pre-check has an endpoint to call.

**Stage D — web wiring**

- Wire the panel end-to-end: `AssistantPanelBody` calls `useShell().conversations.getDefaultForProject()` on mount, submits messages to `/chat/:slug`, streams responses, persists history via the conversations/messages resources.
- Register the global CMD/CTRL + L keybinding in `project-shell-host.tsx`, scoped to the project-shell tree, toggling `activePanel === 'assistant'` and focusing the prompt input on open.
- Add the flat route `apps/web/src/routes/agent/$conversationSlug.tsx` that resolves project context from the conversation, mounts under `ProjectShellHost` with a `virtualTab`, and renders `<AgentTabBody />`; add the `createAgentPath` helper.
- Wire "Open in new tab" in `AssistantPanelBody` to upsert the virtual shell tab via `useOpenConversationInTab(slug)` and navigate to the route.

**Stage E — polish and verification**

- Add the credits banner variant + client-side pre-check: on submit, check balance via `useShell().billing.getBalance()`; disable submit + render banner when zero; handle mid-stream HTTP 402 with an in-conversation error bubble.
- Implement the `SuggestedPrompts: string[]` plugin-root sibling-export contract (mirroring RFC 0005's `HelpPages`): wire the app registry to expose per-plugin prompts, and have `AssistantPanelBody` render them in the empty state with a shell-level fallback.
- Extend `apps/web/src/lib/i18n/locales/<locale>/chat.json` with all new keys enumerated in §11, across every existing locale file.
- Write Vitest unit tests for `AssistantPanelBody` (empty state, populated thread, credits banner), `AgentTabBody` (history dropdown, conversation switch), and the `conversations` shell-runtime resource (happy path + error path); write Playwright E2E tests for the four user journeys in §10.4; run full `pnpm check` and a manual smoke against `pnpm dev`.

---

## 13. Follow-ups (deferred, not in this phase)

- **Phase 2** — new agent tools (create notebook, run saved query, invite member, provision environment).
- **Phase 3** — RAG over help pages + RFCs + in-product docs.
- **Phase 4** — programmatic agent access via personal API tokens (RFC 0009 consumer).
- **Phase 5** — mobile / responsive layouts for `/agent/$slug`.
- **Phase 6** — team-shared conversations, multiplayer editing, permissions model for shared threads.
- **Phase 7** — voice input / output.

---

## Changelog

One line per deviation from this spec discovered during implementation. Populated by `/finish-story` when the "did the spec stay accurate?" check answers no.

- 2026-04-14 — 001-scaffold-qwery-agent-feature-package — §7.6: `packages/ui/src/guepard/layout/assistant-panel.tsx` was deleted rather than rewritten as a wrapper delegating to `@guepard/qwery-agent`. Replaced by an `assistantPanelContent?: ReactNode` prop on `RightSidebar` / `RootLayout` / `ProjectShellLayout`, injected by the host — mirrors RFC 0005's docs-panel pattern and avoids a ui→features dep cycle.
- 2026-04-14 — 004-expose-billing-balance-endpoint — §7.4: no new `/api/billing/balance` Hono server endpoint was added. The existing `GET /api/billing/status?orgSlug=...` (web-side TanStack route, `apps/web/src/routes/api/billing/status.ts`, backed by `GetOrganizationBillingService`) already returns balance and is used in production by the org billing page. Matches the qwery-enterprise pattern. The shell-runtime `billing` resource originally proposed in §7.3 is also dropped — no shell resource; story 008 will add a feature-local `useBillingBalance()` hook that fetches the existing endpoint directly. Story 004 marked `[skipped]`.
- 2026-04-14 — 005-wire-assistant-panel-live — §3.1 / §3.3: active-datasource auto-injection deferred. Spec assumes the shell exposes a current/active datasource that the panel can read and pass as `selectedDatasources` to `<QweryAgentUI>`. There is no such concept on `useShell()` today — datasource selection is route-level state (e.g. notebook bound to a datasource). A route-aware injection layer is its own concern; tracked as a phase-1 follow-up before final shipping, or escalated to phase 2 if scope-bound.
- 2026-04-14 — 006-add-cmd-l-keybinding — §3.3: focus-on-open deferred. Pressing CMD+L opens the panel but does not auto-focus the prompt input. Reaching the textarea inside `<QweryAgentUI>` → `<QweryPromptInput>` requires either prop-plumbing through `QweryAgentUIProps` (invasive API change) or a focus-broadcast event the prompt-input subscribes to. Tracked as a phase-1 polish follow-up; in the meantime users press CMD+L then click/tab to the input.
- 2026-04-15 — 008-add-credits-banner-and-precheck — §1 row 4 / §3.4: two narrowings. (a) Credits banner replaces the **whole agent body** (not just the prompt input alongside a visible thread) because `<QweryAgentUI>` bundles the input with the thread and does not expose a "disable input only" prop. Swapping the whole body is the phase-1 compromise; user history is still on the server and returns when balance > 0. (b) Mid-stream HTTP 402 handling deferred — `<QweryAgentUI>` does not surface `useChat` error state or accept an `onPaymentRequired` callback; catching a 402 mid-generation requires a component-API addition in a dedicated follow-up story. Server-side HTTP 402 on `/api/chat/:slug` remains the source of truth.
- 2026-04-16 — 010-add-qwery-agent-tests — §10.2 / §10.4: test suite scoped down. **Included**: Vitest setup for `@guepard/qwery-agent`; unit tests for `convertMessages` (7 cases, 91.66% coverage); unit tests for `GetOrCreateDefaultConversationService` (5 cases including idempotency). **Deferred**: body-component tests (AssistantPanelBody / AgentTabBody) — mocking `<ShellAppProvider>` + `<QueryClientProvider>` + `<QweryAgentUI>` is high harness-cost vs phase-1 ROI; bodies are thin wrappers over pieces tested at lower layers. **Deferred**: Playwright E2E for the five user journeys — requires chat-stream mocking or a credited LLM account; phase-1 smoke stays manual via `pnpm dev`. **Dropped**: `useOpenConversationInTab` hook was never implemented (story 007 inlined the navigation). Repo-wide `pnpm check` gate blocked on the parallel auth-work session's `userToken`/`jwtSigner` factory update.
- 2026-04-18 — 012-polish-chat-conversation-ui — §3.2 / §7.5: typography + bubble-layout work deferred to follow-up story 013. Guepard keeps its app-wide monospace aesthetic (`--app-font-sans` token in `packages/ui/src/styles/partials/tokens.css`); shrinking chat prose size via wrapper-level Tailwind failed because Streamdown applies its own `prose` rules with higher specificity, and `MessageContent.text-base` is hard-coded. User-message right-alignment also needs DOM-level investigation. Tasks 001 + 002 `[skipped]`. Shipped instead: `onSubmitFeedback` wiring for both bodies (new `useSubmitFeedback` hook → `POST /api/feedback` with the Supabase bearer), a metadata-sync branch in `agent-ui.tsx` so thumbs-state refreshes without reload, compact `PanelHeader` (h-9, inline title), and `PanelHeader` dropped from the `/agent/$slug` tab view (shell tab bar provides the label).
