---
spec: docs/specs/0023-auth-desktop-client-phase1.md
spec_sections:
  - "#75-presentation-appsweb"
  - "#11-i18n-key-map"
status: skipped
started: null
finished: 2026-04-24
blocks: []
blocked_by: ["003", "005"]
---

> **Skipped** — moved out of RFC 0023 phase 1 on 2026-04-24. BYO LLM keys management has its own surface area (provider list, storage strategy, cloud vs desktop split, security controls) that warranted a dedicated RFC. See `docs/rfcs/0026-llm-keys-management.md`.
---

# Render LLM keys settings pane

## Goal

Add a runtime-gated "LLM keys" pane to the existing Settings dialog so a desktop user can save / replace / delete OS-keychain-backed provider keys (Anthropic / OpenAI / Azure / Bedrock / Ollama).

## Scope

**In scope**
- New `SettingsSection` registered in `apps/web/src/components/settings-dialog-mount.tsx` only when `useRuntime() === 'desktop'`.
- Pane component (`apps/web/src/features/desktop-llm-keys/llm-keys-pane.tsx` or similar) — table with one row per `MANAGED_KEYS` entry. Columns: provider name, key status (set / not set), action (set / replace / delete).
- Set / replace modal with masked password input and Save → calls `saveProviderKey` from `@qlm/shell-runtime`.
- Delete confirm dialog → calls `deleteProviderKey`.
- "Restart sidecar to apply" hint after save (no actual restart yet — that lands in story 009).
- New i18n namespace `apps/web/src/lib/i18n/locales/en/desktop.json` with the `settings.llmKeys` keys from spec §11.

**Out of scope**
- `restart_sidecar` Tauri command (story 009).
- Server pane (story 009).
- Other locales — `en` only per resolved decision #11.

## Acceptance criteria

- [ ] `pnpm typecheck` and `pnpm lint` are green; ESLint `@qlm/ui/trans` rule respected.
- [ ] All visible strings flow through `t(...)` against the new `desktop` namespace.
- [ ] `runtime === 'web'` users do not see the pane (manual check in `pnpm --filter web dev`).
- [ ] **Build + UI check (mandatory):** `pnpm --filter desktop tauri:dev`, open Settings → LLM keys pane visible. Save `OPENAI_API_KEY=sk-test`, status flips to `Set`, `security find-generic-password -s run.qlm.desktop -a OPENAI_API_KEY` returns the value, delete clears it. No console errors.
- [ ] Storybook story added for the pane covering empty / partially-set / fully-set states (per `.claude/rules/testing.md`).
- [ ] All Settings-dialog interactions remain reachable via keyboard.

## Tasks

Populated by `/start-story`.

## Demo / verification

```
pnpm --filter desktop tauri:dev
# Open Settings (existing menu) → click "LLM keys".
# Set OPENAI_API_KEY=sk-test, click Save, see status flip.
# Verify keychain via:
security find-generic-password -s run.qlm.desktop -a OPENAI_API_KEY
# Click Delete, confirm, status flips back to "Not set".
```

## Questions surfaced

- <bullet>

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
