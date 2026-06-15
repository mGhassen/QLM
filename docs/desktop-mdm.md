# QLM Desktop — MDM configuration

This document is for IT administrators rolling out QLM Desktop via MDM (Jamf, Intune, Workspace ONE, or equivalent). It documents the `config.json` format and file location for silent provisioning — so end-users never hit the first-run picker.

Phase-1 scope: the MDM file format + delivery mechanism. Signed-config integrity is deferred (see `docs/specs/0023-auth-desktop-client-phase1.md` §9, item 9).

## What MDM can pre-seed

Everything in `config.json` is optional. Pre-seeding a value skips the corresponding first-launch prompt.

| Key                          | Type      | Purpose                                                                                                   |
| ---------------------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| `QLM_SERVER_URL`         | URL       | Which QLM server the sidecar talks to (cloud or on-prem). When set, the first-run picker is skipped. |
| `QLM_SERVER_MDM_DEFAULT` | URL       | Same URL as above, but also displays the "Set by your IT team" badge in Settings → Server.              |
| `QLM_TELEMETRY_ENABLED`  | `"true"` / `"false"` | Toggles OpenTelemetry emission in the sidecar.                                                |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | URL      | OTLP collector endpoint when telemetry is enabled.                                                        |
| `allowInsecureTls`           | `"true"` / `"false"` | **Development only.** Allows HTTP server URLs. Shows a persistent warning banner in the UI. |

All values are strings in JSON (even booleans).

## Sample `config.json`

```json
{
  "QLM_SERVER_URL": "https://qlm.acme-corp.example",
  "QLM_SERVER_MDM_DEFAULT": "https://qlm.acme-corp.example",
  "QLM_TELEMETRY_ENABLED": "true",
  "OTEL_EXPORTER_OTLP_ENDPOINT": "https://otel.acme-corp.example"
}
```

Recommended: set both `QLM_SERVER_URL` and `QLM_SERVER_MDM_DEFAULT` to the same value so users see the MDM badge + can't accidentally connect to a different server without understanding what changed.

## Where the file lives

| OS      | Path                                                              |
| ------- | ----------------------------------------------------------------- |
| macOS   | `~/Library/Application Support/run.qlm.desktop/config.json`    |
| Windows | `%APPDATA%\run.qlm.desktop\config.json`                        |
| Linux   | `~/.config/run.qlm.desktop/config.json`                        |

The app reads the file once per launch. When `QLM_SERVER_URL` is set, the first-run picker is skipped and the sidecar starts directly against that URL.

## Delivery — Jamf Composer

1. Create a new package source with a "fill existing users" template.
2. Write `config.json` to `/Library/Application Support/run.qlm.desktop/config.json` (system-wide) **or** `/Users/Shared/...` and drop a login hook that copies it into each user's `~/Library/Application Support/run.qlm.desktop/`.
3. Scope the policy to the target smart group; trigger on first login.

Apple's recommended pattern is to deploy to `~/Library/Application Support/...` per-user rather than `/Library/...`, because QLM Desktop reads the per-user path.

## Delivery — Intune (Windows)

1. In Endpoint Manager, create a Win32 app with an install script that drops `config.json` into `%APPDATA%\run.qlm.desktop\config.json` under the target user.
2. Assign the app to the user group; enforce at next sign-in.
3. The install script must run in the user context (not `SYSTEM`) so `%APPDATA%` resolves correctly.

## Delivery — Linux silent provisioning

Most Linux deployments script this directly:

```bash
mkdir -p "$HOME/.config/run.qlm.desktop"
cat > "$HOME/.config/run.qlm.desktop/config.json" <<'EOF'
{
  "QLM_SERVER_URL": "https://qlm.acme-corp.example",
  "QLM_SERVER_MDM_DEFAULT": "https://qlm.acme-corp.example"
}
EOF
chmod 600 "$HOME/.config/run.qlm.desktop/config.json"
```

Run from the image's first-boot script or a dotfile installer.

## `allowInsecureTls` — development only

Setting `"allowInsecureTls": "true"` lets the app connect to `http://` QLM servers (typically `http://127.0.0.1:54321` against a dev Supabase). When this is on:

- A red banner appears in Settings → Server.
- `desktop.log` records a startup warning line.
- The setting is intended for local dev only — **do not ship to end users.**

## Security notes

- File integrity is **not** cryptographically verified in phase 1. QLM Desktop trusts the OS file-permission boundary: if an attacker has write access to the user's `~/Library/...` (macOS), `%APPDATA%\...` (Windows), or `~/.config/...` (Linux), they can already subvert many things. Signed-config is a phase-2 follow-up listed in `docs/specs/0023-auth-desktop-client-phase1.md` §13.
- Deploy `config.json` with user-only read/write perms (`0600` on POSIX). The MDM agent itself should enforce this.
- The file never contains secrets. LLM keys live in the OS keychain (see RFC 0026). Refresh tokens live in the OS keychain. Only non-secret routing + toggles go in `config.json`.
- For on-prem HTTPS, ensure the server's certificate is trusted by the user's system keychain before rollout — otherwise the sidecar refuses to connect (and `allowInsecureTls` is not the right escape hatch for prod).

## Troubleshooting

- **User still sees the first-run picker** — verify the file exists at the correct per-user path (not the system-wide `/Library/...`) and contains a valid `QLM_SERVER_URL`. Check `desktop.log` in the same directory for JSON parse errors.
- **"Insecure TLS allowed" banner unexpectedly visible** — `allowInsecureTls` is `"true"`. Remove it or set to `"false"`.
- **Server URL doesn't show the MDM badge** — `QLM_SERVER_MDM_DEFAULT` must exactly match `QLM_SERVER_URL` (trailing slash included).

## References

- Spec: `docs/specs/0023-auth-desktop-client-phase1.md` — §7.8 config shape, §9 security model.
- `MANAGED_KEYS` (LLM provider creds) are deliberately **not** MDM-deployable in phase 1. They live in the OS keychain, owned by the user. See `docs/rfcs/0026-llm-keys-management.md` for the eventual management story.
