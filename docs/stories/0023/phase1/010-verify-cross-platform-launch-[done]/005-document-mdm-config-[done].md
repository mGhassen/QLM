---
story: ./story.md
status: done
layer: docs
model: haiku
files:
  - docs/desktop-mdm.md
  - docs/specs/0023-auth-desktop-client-phase1.md
validation:
  kind: typecheck-only
---

# Document MDM config

Per story §in-scope: a new `docs/desktop-mdm.md` for IT admins rolling out Guepard Desktop via MDM (Jamf / Intune / silent provisioning). Pin down `config.json` shape + per-OS file paths.

## Done when

- [ ] `docs/desktop-mdm.md` (new) covers:
  - Purpose (one paragraph: pre-seed `config.json` so users don't see the first-run picker).
  - `config.json` schema with a sample (`GUEPARD_SERVER_URL`, `GUEPARD_SERVER_MDM_DEFAULT`, `GUEPARD_TELEMETRY_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `allowInsecureTls`).
  - File location per OS:
    - macOS: `~/Library/Application Support/run.guepard.desktop/config.json`
    - Windows: `%APPDATA%\run.guepard.desktop\config.json`
    - Linux: `~/.config/run.guepard.desktop/config.json`
  - How `GUEPARD_SERVER_MDM_DEFAULT` surfaces in the UI (the MDM badge in the Server pane; the banner in first-run).
  - `allowInsecureTls: true` warning — for on-prem development only, shows a persistent warning banner.
  - Jamf Composer / Intune how-to (brief pointers, not step-by-step): pre-stage the file in the user template, or deploy via script at first login.
  - Note that **MDM config integrity is not signed in phase 1** — per spec §9 last box, we trust the OS file-permission boundary.
- [ ] `docs/specs/0023-auth-desktop-client-phase1.md` §13 (Follow-ups) gains a single-line cross-link: `See docs/desktop-mdm.md for the phase-1 config-file format.`
- [ ] `pnpm typecheck` green.

## Notes

- Keep it under 200 lines; it's a rollout aid, not a spec.
- Don't duplicate the spec's security bullets — link to them.
