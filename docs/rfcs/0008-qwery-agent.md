# RFC 0008 — Qwery Agent in the project shell

| Field      | Value                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Status     | Draft                                                                                           |
| Author     | Hani Chalouati                                                                                  |
| Created    | 2026-04-14                                                                                      |
| Target     | Phase 1 — productize the existing agent stack as a user-facing copilot in the project shell    |
| Supersedes | —                                                                                               |
| Related    | [RFC 0005 — Contextual help panels](./0005-contextual-help-panels.md) (sibling right-side panel), [RFC 0009 — Token management](./0009-token-management.md) (downstream consumer for API tokens) |

## 1. Summary

**Qwery Agent** is the user-facing name for the conversational copilot that lives in the right-side assistant panel of the project shell. Users open it from the topbar button or with the **CMD/CTRL + L** keyboard shortcut, chat about their data and the product, and — for longer work — open a dedicated **`/agent/$conversationSlug`** full-page route in a new browser tab.

The entire agent backend and chat UI already exist in this repo: `@qlm/agent-factory-sdk` drives the agent loop, `apps/server/src/routes/chat.ts` exposes `POST /chat/:slug` with credits-gating and tool orchestration, and `packages/ui/src/qlm/ai/*` provides 50+ conversation/message/tool-call components proven in Storybook. What is *missing* is the productization: the shell's `AssistantPanel` is still a static mock, CMD+L does not exist, and there is no flat route for a dedicated conversation view.

Phase 1 ships:

- A **live `AssistantPanel`** that mounts the existing chat components and talks to `/chat/:slug`, with one persistent conversation per (user, project).
- A global **CMD+L** keyboard shortcut that toggles the assistant panel from anywhere in the project shell.
- A **flat route `/agent/$conversationSlug`** that renders the same conversation full-page; multiple browser tabs can hold distinct conversations concurrently.
- **Auto-injected project context** (current project, active datasource where available) so users don't re-state it each turn.
- Access for **all authenticated console users** inside orgs with positive credit balance (the server-side HTTP 402 gate already handles the rest).

Later phases extend capability (tool surfaces, knowledge retrieval, automation scopes) on top of this surface — they do not rebuild it.

## 2. Motivation

Today the right-side `AssistantPanel` is a **hardcoded mock**: three static suggested prompts, a fake avatar, a placeholder welcome bubble. There is no input, no network call, no history. Meanwhile, `@qlm/agent-factory-sdk` is a fully working multi-step agent loop with tool registry, LLM provider abstraction (Claude, Azure, Ollama, Bedrock), streaming via Vercel AI SDK, and MCP support. The chat backend route streams real completions with billing, telemetry, datasource resolution, and message validation. The chat UI package exports every conversational primitive the product needs. **The gap is not capability; it is the last mile of productization.**

Closing this gap unlocks a measurable step-change in what users can do. Today, "how do I reset a branch?", "why is my query slow?", "generate the migration for this schema change" all require the user to leave the product and open a separate AI tool — or find the right docs page. With Qwery Agent wired in, every one of those questions is answerable in the same view where the user is working, with the active project and datasource already in context. This is the primary product lever Qwery sells: *natural-language data work where the data and product context already live*.

The **CMD+L** shortcut exists because the panel must be as fast to open as a command palette — fingers-on-keyboard users should never have to mouse to a topbar icon. The **`/agent/$slug` flat route** exists because a 30% right-side column is the wrong shape for long conversations, deep comparisons, or pasted SQL — users need a full-width surface for serious work, and being a real URL means they can pin, bookmark, and share a conversation, and run several in parallel browser tabs.

The RFC also lands the **user-facing name**. "Qwery" already appears in the mock panel header as a placeholder; this RFC makes it official and removes the ambiguity with `qwery-core` (a separate standalone monorepo that shares the name but is not a dependency of the console).

The work upstream of this is already in the repo: RFC 0005 delivered the `ActivePanel = 'documentation' | 'assistant' | null` shell contract and the `DocsPanelProvider` that this RFC extends. Downstream of this, RFC 0009 (personal API tokens) will eventually power programmatic agent access — but phase 1 of Qwery Agent does not need tokens; it rides the existing session cookie.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- **Live assistant panel**: `AssistantPanel` composes `packages/ui/src/qlm/ai/*` components (conversation, message-item, prompt-input, tool-calls-ui) and calls `POST /chat/:slug` for streaming responses. The hardcoded prompts, fake avatar, and placeholder welcome are removed.
- **One conversation per (user, project) in the panel**: opening the panel in project A shows A's persistent conversation; project B has its own. Reuses the existing `conversations` and `messages` routes.
- **CMD/CTRL + L shortcut**: registered at the project-shell level; toggles the assistant panel open/closed. Focuses the prompt input on open. No-op outside the project shell (org pages, auth pages).
- **Flat route `/agent/$conversationSlug`**: renders the same conversation full-page using the same UI components. Multiple browser tabs can hold distinct conversations simultaneously and persist independently through the conversations API.
- **Auto-injected project context**: the active project (and active datasource where the route exposes one) is passed to `/chat/:slug` so the agent sees it without the user typing it.
- **Access for all authenticated users**: no feature flag, no beta gate; access is governed only by the existing per-org credits check (HTTP 402) on the backend.

### 3.2 Non-goals (phase 1)

- **New agent capabilities / tools**. Phase 2. The existing tool registry is what ships; expanding it (e.g. "create a notebook", "invite a teammate") is out of scope.
- **Product-knowledge retrieval (RAG over help pages / RFCs)**. Phase 3. Phase 1 relies on the agent's system prompt and whatever context the shell auto-injects; no indexing pipeline is built.
- **Personal API tokens for programmatic agent access**. Phase 4, covered by RFC 0009. Phase 1 uses the existing browser session cookie only.
- **Mobile / responsive-first layouts for the full-page route**. Phase 5. `/agent/$slug` is desktop-first; no phone breakpoints in phase 1.
- **Team-shared conversations or multiplayer editing**. Phase 6. Conversations are single-user in phase 1.
- **Voice input / output**. Phase 7. Text-only.

## 4. Prior art in the codebase

- **Reused**: `@qlm/agent-factory-sdk` — the entire agent loop, LLM provider abstraction, tool registry, and MCP integration. Phase 1 does not touch this package.
- **Reused**: `apps/server/src/routes/chat.ts` — the streaming `POST /chat/:slug` endpoint with credits-gating, datasource context, and message validation. Phase 1 consumes it as-is.
- **Reused**: `apps/server/src/routes/conversations.ts` + `messages.ts` — conversation and message persistence. The panel and full-page route both read/write through these.
- **Reused**: `packages/ui/src/qlm/ai/*` — 50+ chat UI components (conversation-content, message-item, prompt-input, model-selector, tool-calls-ui, schema-visualizer, sql-query-visualizer, web-fetch-visualizer). These become the building blocks of the new `AssistantPanel` and the `/agent/$slug` route.
- **Reused**: the `ActivePanel` contract from RFC 0005 (`'documentation' | 'assistant' | null`) and the `RightSidebar` component — the panel slot already exists; we are filling it with real content.
- **Reused**: `packages/shell-runtime` — `useShell()` provides the project / datasource context injection point.
- **Replaced**: `packages/ui/src/qlm/layout/assistant-panel.tsx` — the 56-line mock with hardcoded prompts and fake avatar is rewritten.
- **Orthogonal**: `packages/ui/src/qlm/layout/documentation-panel.tsx` — the sibling panel for contextual help (RFC 0005). Qwery Agent does not touch it; they coexist as distinct panel modes.
- **Orthogonal**: `qwery-core` at `/Users/hani.chalouati/Documents/work/qlm/qwery-core/` — a separate standalone data platform that inspired several patterns (agent-factory-sdk, tool registry, MCP endpoint) already ported here. It is **not** a runtime dependency; the name overlap is purely product naming.

## 5. Conceptual model

### 5.1 One agent, two surfaces

Qwery Agent is a single conversational agent rendered in two places:

| Surface                        | Shape                                  | Conversations            | Typical use                                |
| ------------------------------ | -------------------------------------- | ------------------------ | ------------------------------------------ |
| Right-side assistant panel     | ~30% right column, inside project shell | **One** per (user, project) | Quick questions, short help, inline tasks  |
| Flat route `/agent/$slug`      | Full-page, outside project shell       | **Many** (one per URL)   | Long work, pinned/bookmarked conversations |

Both surfaces render the same UI components and hit the same `/chat/:slug` endpoint. The panel is a shortcut; the route is the workbench.

### 5.2 Conversation lifecycle

A conversation is identified by its slug. The slug follows the project-wide pattern: a UUID v4 primary id paired with a 10-character Sqids-encoded alphanumeric slug (the same scheme used by projects, datasources, notebooks — see qwery-core's `shorten-id.ts`, ported as the canonical identity generator). Slugs are unique, URL-safe, and unguessable without being memorable.

The panel opens the user's "default" conversation for the current project — created on first open, persisted thereafter, one per (user, project). The full-page route is URL-addressed: each distinct `$slug` is a distinct conversation, and opening multiple browser tabs with different slugs means multiple live agents running in parallel — they do not share state.

Clicking **"Open in full view"** from the panel navigates to `/agent/<panel-conversation-slug>` — **same slug, same conversation**, one source of truth. The panel and the full-page route are two views on the same thread; closing the panel does not delete or detach anything.

Context auto-injection happens on every turn: the panel sends the current project (and active datasource if applicable) in the `datasources` field of the chat request; the full-page route does the same if the user navigated there from a project context, otherwise runs context-free.

### 5.3 Entry points

- **Topbar button** (already exists, already toggles `activePanel === 'assistant'`).
- **CMD/CTRL + L** — new global keybinding registered at the project shell level. Toggles the same state.
- **Direct URL** — `/agent/$conversationSlug` is a bookmarkable, shareable route (share requires org membership; no public conversations in phase 1).
- **"Open in full view" action inside the panel** — a button in the panel header that opens the current panel conversation as a new browser tab on `/agent/$slug`, so the user can upgrade a quick question to a deep workspace without losing history.

## 6. UX surface and product integration

- **Panel header**: Qwery avatar (existing), conversation title, model selector, "Open in full view" action, close button. Suggestions list appears only in the zero-state (no messages yet); once a conversation has turns, it becomes a normal scrollable thread with prompt input pinned at the bottom.
- **Prompt input**: the existing `prompt-input.tsx` component. Model selection available via existing `model-selector.tsx`. Slash commands and attachments inherit whatever the UI package already supports.
- **Streaming**: real-time via the existing SSE pipeline from `/chat/:slug`. Tool calls render through `tool-calls-ui` inline with assistant messages.
- **Full-page route chrome**: minimal — no project-shell sidebar. Just the conversation UI, a back-link to the originating project (where known), and a conversations-history dropdown (reads from `GET /conversations`).
- **Keyboard**: CMD+L toggles the panel. Inside the prompt input, normal editor shortcuts apply (nothing new is added here).
- **Empty state**: the panel shows a short set of suggested prompts scoped to the current app. Prompts are contributed by each plugin via a `SuggestedPrompts: string[]` export on `plugin-root.tsx`, discovered by the existing app registry — mirroring the `HelpPages` contract from RFC 0005. The shell falls back to a small default list when the active plugin does not export any.

## 7. Security and trust boundaries

- **Authentication**: session cookie only in phase 1. `/chat/:slug`, `/conversations`, `/messages` already enforce this. No API tokens (RFC 0009 follow-up).
- **Authorization**: conversations are scoped to the authenticated user and their org. Cross-org reads are impossible by construction because `getRepositories(c)` is request-scoped and uses the caller's Supabase session.
- **Billing gate**: two layers. Client-side, the panel and the full-page route call a lightweight balance check on every submit — if zero, the submit button is disabled and an inline "Add credits" banner appears in place of the prompt input. Server-side, `/chat/:slug` still returns HTTP 402 as the source of truth (defends against stale client state). If a stream starts with balance and depletes mid-generation (rare), the stream terminates with an error bubble in the thread and the banner appears for the next turn. Same treatment for both surfaces.
- **Tool side-effects**: phase 1 ships whatever tools are already registered in the agent-factory-sdk tool registry. No new tools; no destructive actions beyond what already exists.
- **Prompt injection**: treated as a known limitation; phase 1 does not introduce new tool side-effects, so the risk surface is the set of existing tools. Hardening is part of whichever later phase introduces new automations.

## 8. Rollout plan

| Phase | Scope                                                                                             | Artifacts                      | Status |
| ----- | ------------------------------------------------------------------------------------------------- | ------------------------------ | ------ |
| 1     | Live `AssistantPanel` + CMD+L + `/agent/$slug` flat route + context auto-injection                 | This RFC + phase-1 spec        | Draft  |
| 2     | New agent tools (create notebook, run saved query, invite member, provision environment)          | Phase 2 RFC                    | Future |
| 3     | RAG over help pages + RFCs + in-product docs (product-knowledge retrieval)                        | Phase 3 RFC                    | Future |
| 4     | Programmatic agent access via personal API tokens (consumer of RFC 0009)                          | Phase 4 RFC                    | Future |
| 5     | Mobile / responsive layouts for `/agent/$slug`                                                     | Phase 5 RFC                    | Future |
| 6     | Team-shared conversations, multiplayer editing, permissions model for shared threads              | Phase 6 RFC                    | Future |
| 7     | Voice input/output                                                                                 | Phase 7 RFC                    | Future |

## 9. Open questions

All decisions surfaced during Q&A have been resolved and folded into §5 through §7 above. No unresolved questions remain at the RFC level. Any implementation-level ambiguity will be pinned down in the phase-1 spec.

(Historical note — resolutions captured in the body: slug format follows the repo-wide UUID + 10-char Sqids pattern (§5.2); "Open in full view" keeps the same slug and same conversation (§5.2 and §5.3); suggested prompts are contributed per plugin via a `SuggestedPrompts` export on `plugin-root.tsx`, mirroring RFC 0005's `HelpPages` (§6); billing uses a pre-check on submit plus an in-stream fallback for rare mid-stream depletion (§7).)

## 10. Alternatives considered

- **Reuse an external chat component library (e.g. Vercel AI Chatbot template).** Rejected — `packages/ui/src/qlm/ai/*` already covers every primitive and is tuned for our tool-call visualization (schema-viz, SQL-viz, web-fetch-viz). Replacing would be a rewrite for zero product gain.
- **Ship the full-page route first and skip the panel wiring.** Rejected — the panel is the primary entry point for quick questions and is the one users will discover via the existing topbar icon. Shipping only `/agent/$slug` would leave the mock panel visible in production and signal that the feature is incomplete.
- **Ship the panel only and defer the full-page route.** Deferred (considered). The panel alone addresses 80% of the use cases, but serious conversations (pasted SQL, long error traces, side-by-side comparisons) do not fit in 30% of the screen. Adding the route later would still be breaking for users who learned to work in the panel; shipping both at once sets the right expectation.
- **Use a command-palette modal (CMD+K-style) instead of a side panel for CMD+L.** Rejected — modal loses context of the app underneath, which defeats the point of project-aware assistance. The side panel keeps the user's work visible.
- **Embed one agent per plugin (notebook agent, datasource agent, etc.).** Rejected — fragments history, wastes LLM context, multiplies maintenance. One agent with project/app context injected covers the same use cases at a fraction of the cost.

## 11. References

- [RFC 0005 — Contextual help panels](./0005-contextual-help-panels.md) — sibling right-side panel, established the `ActivePanel` contract and `DocsPanelProvider` pattern reused here.
- [RFC 0009 — Token management](./0009-token-management.md) — downstream; phase 4 of this RFC consumes it.
- `packages/agent-factory-sdk/src/` — agent loop, LLM providers, tool registry, MCP.
- `apps/server/src/routes/chat.ts` — streaming chat endpoint.
- `packages/ui/src/qlm/ai/` — chat UI component library.
- `packages/ui/src/qlm/layout/assistant-panel.tsx` — the mock replaced in phase 1.
- `packages/ui/src/qlm/layout/right-sidebar.tsx` — the panel slot.
- `packages/ui/src/qlm/layout/topbar-actions.tsx` — the existing toggle button.

---

## Review checklist for the author

- [ ] Does §1 make the scope obvious in one paragraph?
- [ ] Is every §3.1 goal an observable exit criterion?
- [ ] Is every §3.2 non-goal pinned to a named future phase?
- [ ] Does §4 distinguish reused prior art from replaced prior art?
- [ ] Would a newcomer understand the concept after reading only §1 through §5?
- [ ] Are the open questions real decisions, or are any of them placeholders?
- [ ] Does the rollout plan match realistic engineering capacity for the next quarters?
- [ ] Does every alternative in §10 have a concrete reason it was not chosen?

---

## Amendments

Changes to this RFC after the phase-1 spec was scaffolded. The body above is immutable — read these amendments alongside it.

### A1 — 2026-04-14 — "Tabs" means shell tabs, not browser tabs

**What changed.** Throughout §5.1, §5.2, §5.3, and §6 the RFC talked about "browser tabs" for the `/agent/$slug` surface. That wording is wrong. The project shell already has its own tab system (`ShellTabStored` persisted per-project in `sessionStorage`, `activeTabId` URL-driven, `VirtualTab` pattern for flat routes — see `apps/web/src/shell/project-shell-host.tsx`). The correction:

- Multiple concurrent Qwery Agent conversations appear as **distinct shell tabs inside the same project's tab bar**, alongside notebooks, datasource views, and any other contextual tabs — not as separate browser windows or browser tabs.
- "Open in full view" (renamed conceptually to "Open in new tab") upserts a virtual shell tab for the conversation, with `href = /agent/$slug`, and focuses it. Closing the shell tab closes the surface; the underlying conversation persists.
- Shell-tab state is per-project (each project has its own persisted `openTabs` list). Conversations remain per-project too, so the model is consistent.
- This supersedes §6's line *"Full-page route chrome: minimal — no project-shell sidebar"*. The `/agent/$slug` route now renders **inside** the project shell (with the same sidebar, tab bar, and topbar), and the shell tab represents the conversation.

**Why.** The surfaced model aligns with an existing shell primitive (tabs) instead of inventing a new one (a chrome-less full-page route). Users already understand "I can have several tabs open in this project" — conversations become one more kind of tab. It also removes the complication of a sidebar-less route that would have been a styling outlier.

**What does not change.** The panel still holds exactly one conversation per (user, project). The slug scheme, context auto-injection, billing UX, suggested-prompts contract, and entry points are unchanged. The only correction is the rendering target of `/agent/$slug`.

**Downstream effect on the spec.** The phase-1 spec (`docs/specs/0008-qwery-agent-phase1.md`) §2 user stories, §3 information architecture, §4 component split, §5 endpoints, and §7 work items are adjusted to reflect shell tabs. Implementation sequencing stays the same; only the target artefact for the full-page route changes from "a chrome-less route" to "a `/agent/$slug` route mounted under the project shell with a virtual shell tab".

