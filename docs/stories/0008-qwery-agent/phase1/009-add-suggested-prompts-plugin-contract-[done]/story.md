---
spec: docs/specs/0008-qwery-agent-phase1.md
spec_sections:
  - "#75-presentation--feature-package-packagesfeaturesqwery-agent"
  - "#1-resolved-open-questions"
status: done
started: 2026-04-16
finished: 2026-04-16
blocks:
  - 010-add-qwery-agent-tests
blocked_by:
  - 001-scaffold-qwery-agent-feature-package
  - 005-wire-assistant-panel-live
---

# Add suggested prompts plugin contract

## Goal

Implement the plugin-root sibling export `SuggestedPrompts: string[]` — discovered by the existing Vite-glob app registry — so each plugin contributes per-app prompts that appear in the `AssistantPanelBody` empty state, with a shell-level fallback list when the active plugin exports none. Mirrors RFC 0005's `HelpPages` pattern.

## Scope

**In scope**

- Extend the shell app registry (`apps/web/src/shell/app-registry.ts`) to read `SuggestedPrompts: string[]` from plugin-root exports alongside `default`, `FlatRoot`, `resolveProjectContext`, and `HelpPages`.
- Add a `getSuggestedPrompts(routeBase: string | null): string[]` method on the registry that returns the plugin's list when defined, else an empty array.
- Consume it inside `AssistantPanelBody`: when the conversation is empty (zero messages), render the plugin's prompts (or a shell-level default of 3 generic prompts if the plugin didn't contribute any). Clicking a prompt pre-fills the prompt input.
- Wire one plugin as a first consumer — **notebook** is the natural choice (data/SQL focus fits the prompts) — exporting e.g. `["Summarize this notebook's datasources", "Suggest a query for my active datasource", "Explain the last error I saw"]`. Keep the default list short; out of scope to tune every plugin's list in phase 1.

**Out of scope** (forces honest slicing)

- LLM-generated prompts from recent activity (deferred).
- Plugin-contributed prompts for every existing plugin (phase 1 only wires notebook + the shell-level fallback).
- Localizing the prompts — phase 1 ships English strings owned by each plugin; i18n of prompt copy is a follow-up.

## Acceptance criteria

- [x] `apps/web/src/shell/app-registry.ts` exposes `getSuggestedPrompts(routeBase)` with a shell-level `DEFAULT_SUGGESTED_PROMPTS` fallback.
- [x] Notebook plugin (`packages/apps/notebook/src/plugin-root.tsx`) exports `SuggestedPrompts: string[]` sibling to its other exports.
- [⚠] Opening the panel on a notebook route shows notebook-contributed prompts; clicking one pre-fills the input — code path verified (host resolves via `registry.getSuggestedPrompts(activeRouteBase)` → `<AssistantPanelBody initialSuggestions={...}>` → `<QweryAgentUI initialSuggestions={...}>`). Live smoke pending `pnpm dev`.
- [⚠] Non-notebook routes show the shell-level default list. Same code path with fallback; live smoke pending.
- [x] `pnpm --filter @qlm/qwery-agent typecheck` + `pnpm --filter @qlm/notebook typecheck` both clean. Full `pnpm typecheck` still blocked on the parallel auth-work session's `userToken` / `jwtSigner` factory issue — unrelated to this story.

## Tasks

1. [001-extend-app-registry-suggested-prompts](001-extend-app-registry-suggested-prompts-[done].md) ✅
2. [002-wire-notebook-suggested-prompts](002-wire-notebook-suggested-prompts-[done].md) ✅
3. [003-resolve-prompts-in-project-shell-host](003-resolve-prompts-in-project-shell-host-[done].md) ✅
4. [004-accept-initial-suggestions-in-panel-body](004-accept-initial-suggestions-in-panel-body-[done].md) ✅

## Demo / verification

```bash
pnpm dev
# 1. Open a notebook route → open panel (empty conversation) → see notebook-contributed prompts.
# 2. Click a prompt → prompt input is pre-filled → submit → normal flow continues.
# 3. Open the panel on a route whose plugin has no SuggestedPrompts → see the shell-level default list.
```

## Questions surfaced

- <bullet>

## Notes

- 001: `SuggestedPrompts` contract mirrors `HelpPages` end-to-end — same placement, same discovery, same method-on-registry shape. Shell default `DEFAULT_SUGGESTED_PROMPTS` (3 generic prompts) lives as a private const in `app-registry.ts`.
- 004: `AgentTabBody` deliberately does not accept `initialSuggestions`. Tab view is conversation-scoped (user arrived via `/agent/<slug>`), not route-scoped; per-plugin prompts belong to the panel only. Documented with a code comment.
- Other plugins (dashboard, datasources, integrations) intentionally don't contribute prompts in this story; they'll fall through to the shell default and can add their own exports later without touching this story's wiring.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. **yes** — implementation exactly matches §1 row 3's resolution ("plugin-root sibling export discovered by the app registry, mirrors RFC 0005's `HelpPages`") and §7.5's feature-package contract.
