# RFC 0026 — LLM keys management

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Status     | Draft                                                                 |
| Author     | Hani CHALOUATI                                                        |
| Created    | 2026-04-24                                                            |
| Target     | How users bring, store, and use their own LLM provider credentials    |
| Supersedes | —                                                                     |
| Related    | 0023 (Desktop client auth) — carved out story 006 lives here instead  |

## 1. Summary

> **STUB — to be drafted by the author.**
>
> This RFC was carved out of RFC 0023 phase 1 on 2026-04-24. The original plan placed BYO LLM keys inside the desktop client RFC, but the feature has enough independent surface area (provider list, storage strategy, web-vs-desktop split, security controls) to warrant its own RFC.
>
> Phase 0023 prior art worth pulling in here when drafting:
> - `apps/desktop/src-tauri/src/keyring_cmds.rs` — `save_api_key` / `get_api_key` / `delete_api_key` Tauri commands with per-platform backends (macOS Keychain / Windows Credential Manager / Linux Secret Service). Already ships.
> - `apps/desktop/src-tauri/src/keys.rs` — `MANAGED_KEYS` constant listing the phase-1 provider env vars (Anthropic / OpenAI / Azure / Bedrock / Ollama).
> - `apps/desktop/src-tauri/src/lib.rs` — sidecar-spawn env injection loop that reads `MANAGED_KEYS` from keychain and forwards them to the Bun child (story 003).
> - `apps/desktop/src-tauri/src/ipc.rs` — keyring-IPC HTTP listener (story 004). The sidecar can read/write the keychain at runtime, not just at spawn.
> - `packages/shell-runtime` — `saveProviderKey`, `getProviderKey`, `deleteProviderKey` helpers (story 005) that the renderer uses to talk to the Tauri keychain.
> - `apps/web/src/components/settings-dialog-mount.tsx` — runtime-gated `SettingsSection` registration pattern established by story 009's Server pane.
> - `apps/web/src/lib/i18n/locales/en/desktop.json` — the `settings.llmKeys.*` i18n keys are listed in RFC 0023 spec §11 but never shipped.

## 2. Motivation

<stub>

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

<stub>

### 3.2 Non-goals (phase 1)

<stub>

## 4. Prior art in the codebase

<stub — draft from the bullet list in §1>

## 5. Conceptual model

<stub>

## 6. Open questions

1. **Desktop-only vs web-parity.** RFC 0023 assumed desktop-only (OS keychain). Web support needs server-side storage with encryption + RLS, plus a Supabase-backed repository. Is phase 1 desktop-only (matching 0023's shipped scaffolding), or does it cover web from day one?
2. **Provider list scope.** 0023's `MANAGED_KEYS` is Anthropic, OpenAI, Azure (three vars: key + resource + deployment), AWS Bedrock (three vars: access key + secret + region), Ollama, plus `AGENT_PROVIDER` / `DEFAULT_MODEL`. Is that the phase-1 surface, or broader / narrower?
3. **Relationship to the deferred QLM cloud LLM proxy.** RFC 0023 §13 lists a `qlmCloud()` `LanguageModelV2` provider as future work. Does this RFC plan the hand-off, or is it strictly about user-supplied keys?
4. **Multi-profile.** One set of keys per install, or per user / per server-URL?
5. **Secret redaction in logs / telemetry.** What's the redaction contract the agent-factory-sdk must honour?

## 7. Alternatives considered

<stub>

## 8. References

- RFC 0023 — Desktop client auth (where this feature originated).
- `.claude/rules/security.md` — secrets storage rules.
- `packages/agent-factory-sdk` — the runtime consumer of these keys.

---

## Review checklist for the author

- [ ] Does §1 make the scope obvious in one paragraph?
- [ ] Is every §3.1 goal an observable exit criterion?
- [ ] Is every §3.2 non-goal pinned to a named future phase?
- [ ] Does §4 distinguish reused prior art from replaced prior art?
- [ ] Would a newcomer understand the concept after reading only §1 through §5?
- [ ] Are the open questions real decisions, or are any of them placeholders?
- [ ] Does the rollout plan match realistic engineering capacity for the next quarters?
- [ ] Does every alternative in §7 have a concrete reason it was not chosen?
