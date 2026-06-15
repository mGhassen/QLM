---
story: ./story.md
status: done
layer: docs
model: haiku
files:
  - docs/specs/0023-auth-desktop-client-phase1.md
validation:
  kind: typecheck-only
---

# Tick security checklist

Spec §9 has 11 unchecked security boxes. Walk each one against the shipped implementation across stories 001–012 and tick (or amend + link to a Changelog entry for any caveat).

## Done when

- [ ] Spec §9 boxes 1–11 are each either `[x]` with no change, or `[x]` with an inline note pointing to the Changelog entry that clarifies the caveat. The specific mapping:
  1. Same-origin webview ↔ sidecar → shipped (story 002). `[x]`.
  2. Sidecar binds `127.0.0.1` when `GUEPARD_RUNTIME=desktop` → shipped (story 007 `desktop-runtime.ts`). `[x]`.
  3. Per-launch bearer token, never logged → shipped (story 004 `ipc.rs` + `lib.rs` redaction). `[x]`.
  4. Rate-cap + clock-skew → shipped (story 004). `[x]`.
  5. Refresh token + LLM keys redacted from logs → shipped (story 004 redactor). `[x]`. Caveat: `MANAGED_KEYS` values — redaction is defensive (we never log them), see story 010 Changelog entry.
  6. HTTPS-only remote server URLs + `allowInsecureTls` opt-in → shipped (story 009 Server pane banner). `[x]`. Caveat: story 012 surfaced a `tauri://localhost` mixed-content limitation for **HTTP local Supabase** in the packaged `.app`; link the 012 Changelog entry.
  7. OS keychain only, no plaintext fallback → shipped (story 003). `[x]`.
  8. Tauri capabilities grant only what §7.8 lists → verify against `apps/desktop/src-tauri/capabilities/default.json`. `[x]` if match.
  9. MDM `config.json` integrity not verified in phase 1 → documented in story 010 task 005 (`docs/desktop-mdm.md`). `[x]`.
  10. System-browser OAuth deferred → no in-webview OAuth screens shipped. `[x]`.
  11. Residual threats called out → verify §9 last paragraph still accurate. `[x]`.
- [ ] Any box that cannot be ticked honestly **stays unticked** — flag it in the story's Questions surfaced section instead. No false ticks.
- [ ] `pnpm typecheck` green.

## Notes

- Verify #8 by diffing `apps/desktop/src-tauri/capabilities/default.json` against spec §7.8's bullet list (shell-sidecar allowlist for bun + api-server, opener, dialog, no shell-execute beyond sidecar).
- Spec anchor: `#9-security-checklist`.
