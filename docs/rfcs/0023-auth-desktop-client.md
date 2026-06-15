# RFC 0023 — Desktop client auth

| Field      | Value                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Status     | Draft                                                                                                                  |
| Author     | Hani Chalouati                                                                                                         |
| Created    | 2026-04-14                                                                                                             |
| Target     | Phase 1 — Tauri 2 + Bun-sidecar desktop app on top of the existing Supabase backend                                     |
| Supersedes | —                                                                                                                      |
| Related    | RFC 0012 (Better Auth — later swap), RFC 0013 (MFA), RFC 0016 (audit log — owns audit table), RFC 0018 (session hardening) |

> **Note:** the body of this RFC is intentionally identical to `docs/specs/0023-auth-desktop-client-phase1.md`. The spec is the working document; this file mirrors it so RFC and spec cannot drift. Update both together (or just edit the spec and `cp` over here).

## 0. Context (why we're doing this)

Phase 1 ships the desktop app for guepard, built on **Tauri 2 (Rust)** with the **full Bun-sidecar architecture lifted from `qwery-core/apps/desktop`**. The Tauri webview loads from `http://127.0.0.1:<port>` served by a bundled `apps/server` binary; the renderer (`apps/web`) is reused unchanged. Auth runs against the **existing Supabase backend** — Better Auth migration (RFC 0012) is not a prerequisite.

Three constraints drive the architecture:

1. **The agent loop must execute SQL tools locally** against customer datasources. Routing large result sets through a cloud relay breaks on latency, bandwidth, and data-locality, and leaks customer data unnecessarily. The sidecar runs the agent loop locally and only calls cloud APIs for identity (and, in later phases, audit + LLM proxy).
2. **`qwery-core/apps/desktop` already solved the desktop shell.** Tauri 2, Bun sidecar lifecycle (port discovery, PID tracking, kill-previous, graceful shutdown), `keyring` integration with native backends per OS, app config persistence, Windows-specific webview workarounds. Lifting it saves weeks.
3. **Auth via the local sidecar reuses `apps/server`'s existing Supabase integration.** No PKCE+loopback infrastructure needed for phase-1 sign-in (email/password, magic link). The sidecar serves auth pages from the same origin as the rest of the app; cookies live on `127.0.0.1`. The only desktop-specific addition is keychain-backed refresh-token persistence so sessions survive port changes between launches.

Two deployment modes:

- **Cloud** — default; sidecar talks to `api.guepard.com`.
- **On-prem** — server URL configured at install time; everything else identical.

**Out of scope for phase 1:** OAuth provider sign-in (Google / GitHub / SAML — needs PKCE + system browser, deferred); audit-event augmentation (RFC 0016 owns the audit table; we wire `client_type` once it lands); cloud LLM proxy + `guepardCloud()` `LanguageModelV2` provider (BYO keys via keychain bridges until proxy ships); hard MDM enforcement (`enforceEnterprise` lock); Better Auth swap; refresh-token reuse detection; multi-profile switcher; custom protocol handler; certificate pinning; device attestation.

---

## 1. Resolved design decisions

| # | Decision                                                                                                                                          | Resolution for phase 1                                                                                                                                                                                                                                                                                                                                                                                |
| - | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Sidecar → Tauri keychain transport — localhost IPC with one-time shared token, or renderer-mediated bridge?                                       | **Localhost IPC, one-time token.** Tauri binds an HTTP listener on a random localhost port at startup. Sidecar receives the port via `GUEPARD_KEYRING_PORT` and a per-launch one-time token via `GUEPARD_KEYRING_TOKEN`. Every keychain call sends `Authorization: Bearer <GUEPARD_KEYRING_TOKEN>`; Tauri rejects requests with a missing/wrong token. Decouples sidecar boot-time refresh from webview readiness. |
| 2 | Where in the keychain to store auth tokens?                                                                                                        | **Refresh token only, single entry per server URL.** Key format: `refresh_token:<serverUrl>`. The sidecar holds the live access token in memory only — replaced on every refresh. Smaller attack surface; access-token rotation never touches durable storage.                                                                                                                                       |
| 3 | Allow server URL change without sign-out?                                                                                                          | **No — always force sign-out + keychain purge.** When the user submits a new URL in Settings → Server, the sidecar (a) calls Supabase `signOut`, (b) deletes `refresh_token:<oldServerUrl>` via Tauri IPC, (c) writes the new `GUEPARD_SERVER_URL` to `config.json`, (d) restarts the sidecar so the new URL takes effect.                                                                            |
| 4 | MDM enforcement strength — hard lock or soft default?                                                                                              | **Soft enforcement.** MDM `config.json` provides defaults; never blocks. The first-run picker is **always shown**, with the MDM-supplied URL pre-selected when present. Settings → Server stays editable. Hard `enforceEnterprise` lock deferred to a later phase if customers demand it.                                                                                                              |
| 5 | Self-signed on-prem certs — hard fail, prompt-to-trust, or opt-in dev override?                                                                    | **Hard fail in production; opt-in dev override.** Sidecar refuses self-signed certs by default. `config.json` may set `allowInsecureTls: true` (or env `GUEPARD_ALLOW_INSECURE_TLS=1`) to permit them — intended for dev/staging only. Production builds emit a startup warning to `desktop.log` and the Settings UI surfaces a banner whenever this flag is on.                                       |
| 6 | Sidecar port stability — accept that `pick_port(4096)` may shift between launches, or pin a port in `config.json`?                                 | **Accept the shift.** Webview cookies are ephemeral per launch; the durable identity is the keychain `refresh_token:<serverUrl>`. The sidecar reads it at boot, refreshes against Supabase, sets a fresh cookie on the webview before the user sees anything. No port pinning, no `config.json` bookkeeping for ports.                                                                              |
| 7 | Renderer architecture — full Bun sidecar or static-renderer with bearer tokens to remote API?                                                       | **Full Bun sidecar.** Lifted verbatim from qwery-core: `pick_port(4096)` fallback, PID file at `app_config_dir/api-server.pid`, kill-previous on launch, Windows env-subset, server-ready TCP loop, log forwarding. Renderer loads `http://127.0.0.1:<port>` from a `window.__GUEPARD_API_URL` injection. Static-renderer rejected because the agent loop must execute SQL tools locally.            |
| 8 | LLM call routing in phase 1?                                                                                                                       | **Direct providers only (BYO keys).** `packages/agent-factory-sdk` keeps its existing `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/azure`, `@ai-sdk/amazon-bedrock`, `@ai-sdk/openai-compatible` (Ollama) providers — all Vercel AI SDK v6 / `LanguageModelV2`. Provider keys live in the OS keychain via Rust `keyring` commands and are injected as env vars into the Bun sidecar at spawn. Cloud `guepardCloud()` provider is a later phase. |
| 9 | First-run picker UX?                                                                                                                                | **Full-screen blocking page.** Tauri webview loads `/desktop/first-run` if no `GUEPARD_SERVER_URL` is set; user must pick before anything else loads. MDM-supplied URL pre-selected if present.                                                                                                                                                                                                       |
| 10 | Audit-event augmentation (`client_type`, `client_version`) in phase 1?                                                                             | **Deferred to RFC 0016.** The audit-event table doesn't exist yet — RFC 0016 owns its design. Desktop wires `client_type` / `client_version` once 0016 lands. Phase 1 ships without audit emission rather than racing the table design.                                                                                                                                                                |
| 11 | i18n scope for new desktop-only strings?                                                                                                            | **`en` only, in a new `desktop.json` namespace** under `apps/web/src/lib/i18n/locales/en/`. Mirrors the existing one-namespace-per-area pattern (`auth.json`, `settings.json`, etc.). Other locales added when the project gains more languages.                                                                                                                                                       |

## 2. User stories

- As a desktop user, I can sign in against `api.guepard.com` (the default cloud server) using my existing Supabase credentials, via the in-app sign-in screen served by the local sidecar.
- As an on-prem customer, I can configure a custom server URL at first run and sign in against my own deployment with the same flow.
- As an enterprise admin, I can deliver a `config.json` via MDM so my users see the enterprise URL pre-selected on first launch (they still confirm).
- As a user with MFA enabled, my challenge plays out in the in-app sign-in screen exactly like the web flow — no desktop-specific MFA UI.
- As a user, my refresh token lives only in the OS keychain — never on disk in plaintext, never in logs.
- As a user, when I sign out from desktop both my local refresh token and my Supabase session are revoked.
- As a user, when I change the server URL from Settings the app force-signs me out and purges the keychain entry for the previous profile before accepting the new URL.
- As a desktop user, I can configure my LLM provider keys (Anthropic / OpenAI / Azure / Bedrock / Ollama) in Settings; they're stored in the OS keychain and injected into the sidecar at spawn.
- As a developer testing on-prem with a self-signed cert, I can opt in via `allowInsecureTls: true` in `config.json` (or `GUEPARD_ALLOW_INSECURE_TLS=1`) and see a clear banner that this is a non-production setting.

## 3. Functional flow

### 3.1 Information architecture

Three runtime-gated additions to `apps/web` for desktop:

- `/desktop/first-run` — full-screen blocking page; only routable when no `GUEPARD_SERVER_URL` is configured.
- Settings dialog → "Server" pane — visible only when `runtime === 'desktop'`. Shows current server URL, MDM-default badge if applicable, "Change server" action.
- Settings dialog → "LLM keys" pane — visible only when `runtime === 'desktop'`. Form for `MANAGED_KEYS` provider keys; values masked, "Save" / "Delete" per row.

The existing sign-in / MFA / password-reset routes are reused unchanged — they're served by the local sidecar to the Tauri webview at `127.0.0.1:<port>`.

### 3.2 Screen-by-screen

**`/desktop/first-run`** — a centred card on a full-page background. Two radio options: "Cloud (guepard.com)" (default-selected) and "Custom server URL". Selecting "Custom server URL" reveals a text input with TLS validation on blur. CTA "Continue" disabled until a valid choice is made. If MDM `config.json` is present, the matching option is pre-selected and a small banner reads "Your IT team configured this URL".

**Settings → Server pane** — read-only display of current server URL + a "Change server" button. The change flow opens a confirmation dialog ("This will sign you out and clear local credentials") followed by a URL input (same TLS validation as first-run). On confirm: sign-out → keychain purge → write `config.json` → restart sidecar.

**Settings → LLM keys pane** — table with one row per `MANAGED_KEYS` entry. Columns: provider name, key status (set / not set), action (set / replace / delete). Setting opens a modal with a single password-style input and Save. Successful save invokes Tauri `save_api_key`; the sidecar's environment is updated on next sidecar restart (with a "Restart sidecar to apply" hint shown after the save).

**Existing sign-in / MFA / password-reset** — unchanged. Served by sidecar.

### 3.3 User flows (happy paths)

**First launch (no prior session):**
1. App opens → Tauri shell reads/creates `config.json` and binds the keyring IPC listener.
2. `GUEPARD_SERVER_URL` not set → Tauri spawns sidecar with `GUEPARD_FIRST_RUN=1`; webview loads `/desktop/first-run`.
3. User selects Cloud and clicks Continue → renderer calls `set_app_config({ GUEPARD_SERVER_URL: "https://api.guepard.com" })` → Tauri writes to `config.json` and triggers `restart_sidecar`.
4. Sidecar restarts with `GUEPARD_SERVER_URL` set → webview reloads → redirected to `/auth/sign-in`.
5. User enters email + password → sidecar completes Supabase flow → POSTs `refresh_token:<serverUrl>` to keyring IPC → sets session cookie on webview → webview redirects to home.

**App restart with existing session:**
1. App opens → Tauri reads `config.json`, binds keyring IPC, reads `refresh_token:<GUEPARD_SERVER_URL>` from the keychain.
2. Tauri spawns sidecar with `GUEPARD_REFRESH_TOKEN=<value>` env var (in addition to URL + LLM keys + IPC env).
3. Sidecar boots, sees the refresh token, exchanges with Supabase, POSTs the new refresh token back via keyring IPC.
4. Webview loads → sidecar serves authenticated session → user lands on home, never sees the sign-in page.

**Sign-out:**
1. User clicks sign-out → webview hits sidecar `/auth/sign-out`.
2. Sidecar calls Supabase `signOut`, clears local session cache, DELETEs `/keyring/refresh_token:<serverUrl>` via IPC.
3. Webview redirects to `/auth/sign-in`.

**Server-URL change:**
1. User opens Settings → Server, clicks "Change server", confirms the warning.
2. Renderer triggers sign-out flow (per above) → keychain purged for old URL.
3. Renderer calls `set_app_config({ GUEPARD_SERVER_URL: <new-url> })` → Tauri writes config, calls `restart_sidecar`.
4. Sidecar restarts with new URL → webview reloads to `/auth/sign-in` against new server.

### 3.4 Error and edge-case behaviour

| Scenario | Behaviour |
| -------- | --------- |
| OS keychain unavailable (no daemon, locked) | Tauri `get_api_key` returns error; sidecar boot proceeds without `GUEPARD_REFRESH_TOKEN`; webview lands on sign-in screen. Banner: "Could not access OS keychain — sign-in required this session." |
| Sidecar fails to start (binary missing, port-busy after fallback, signature failure) | Tauri shows a recovery window with `desktop.log` tail + retry / quit buttons. No webview spawned. |
| Refresh-token expired during boot rehydration | Sidecar's Supabase refresh call returns 401; sidecar removes the keyring entry (DELETE via IPC), webview lands on sign-in. |
| Server URL TLS failure | First-run picker / Settings server-switcher displays inline error; URL not saved. `allowInsecureTls` flag offered as a tooltip pointing to docs. |
| MDM `config.json` malformed | Tauri logs the parse error, ignores the file, falls back to default first-run picker. |
| Network offline at sign-in | Sidecar surfaces "could not reach <serverUrl>" through its existing error channel; webview shows the same error banner the web build does. |
| Sidecar crashes mid-session | Tauri's `before-quit` handler kills children; on next launch, kill-previous via PID file cleans up. Webview shows "connection lost" until sidecar respawn. |

## 4. Technical flow

### 4.1 Layered sequence diagrams

**App launch with existing session:**

```
Tauri shell                                Sidecar (Bun)                     Supabase
───────────                                ─────────────                     ────────
read config.json
bind keyring-IPC :random with 1-time token
read refresh_token:<url> from keychain
spawn sidecar(GUEPARD_RUNTIME=desktop,
              GUEPARD_SERVER_URL=<url>,
              GUEPARD_REFRESH_TOKEN=<r>,
              GUEPARD_KEYRING_PORT=<p>,
              GUEPARD_KEYRING_TOKEN=<t>,
              ...MANAGED_KEYS env)
                                            startup
                                            see GUEPARD_REFRESH_TOKEN
                                            POST /token (refresh)         →  validate, rotate
                                                                          ←  {access, refresh, exp}
                                            POST :p/keyring/set
                                              {key: refresh_token:<url>,
                                               value: <new refresh>}
                                              Authorization: Bearer <t>
keyring write OK                           ←
                                            store access in memory
                                            bind 127.0.0.1:<port>
                                            ready
TCP probe :port → ready                   ←
inject window.__GUEPARD_API_URL
load webview at 127.0.0.1:<port>
                                            serve /                       →  authenticated
```

**First sign-in:**

```
Webview         Sidecar (Bun)                Supabase                  Tauri shell IPC
───────         ─────────────                ────────                  ───────────────
GET /          → check session, none
                redirect /auth/sign-in
GET /auth/sign-in → render sign-in page
POST /auth/sign-in
  {email, password}
                → POST /auth/v1/token       → validate
                                            ← {access, refresh}
                                              POST /keyring/set
                                                {key: refresh_token:<url>,
                                                 value: <r>}
                                                Authorization: Bearer <t>
                                                                              keyring write
                                            ←                                 OK
                set session cookie
                redirect /
GET /          → authenticated content
```

**Sign-out:**

```
Webview         Sidecar (Bun)                Supabase                  Tauri shell IPC
───────         ─────────────                ────────                  ───────────────
POST /auth/sign-out
                → POST /auth/v1/logout      → invalidate session
                                            ←
                  DELETE /keyring/refresh_token:<url>
                    Authorization: Bearer <t>
                                                                              keyring delete
                                            ←                                 OK
                clear cookie
                redirect /auth/sign-in
```

### 4.2 Component split

- **Tauri shell** (`apps/desktop/src-tauri/`, Rust) — owns: window lifecycle, sidecar spawn/lifecycle, OS keychain ops, app config JSON, log file, keyring-IPC HTTP listener. Does NOT own: auth flow, Supabase calls, agent loop.
- **Sidecar** (`apps/server` running with `GUEPARD_RUNTIME=desktop`) — owns: auth flow, Supabase calls (sign-in, refresh, sign-out), agent loop, SQL tool execution, local SQLite session cache. Calls Tauri shell IPC only for keychain ops.
- **Renderer** (`apps/web`) — three runtime-gated additions (first-run picker, Server pane, LLM keys pane). Otherwise unchanged. Talks to sidecar at `127.0.0.1:<port>` via same-origin cookies.
- **Domain** (`packages/domain`) — no new entities in phase 1; auth DTOs already exist for the web build.

See `.claude/rules/hexagonal-architecture.md` — the desktop shell is a host-level concern, not a domain concern.

## 5. API contracts

### 5.1 Data shapes

```ts
// apps/desktop/src-tauri/src/config.rs ↔ packages/shared/src/desktop
type ServerConfig = {
  GUEPARD_SERVER_URL?: string;
  GUEPARD_TELEMETRY_ENABLED?: 'true' | 'false';
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  allowInsecureTls?: boolean;
};

// MDM-delivered file is the same shape, written under app_config_dir/config.json before first launch.
type MdmConfig = ServerConfig;

// Keyring IPC request/response (sidecar → Tauri)
type KeyringSetRequest = { key: string; value: string };
type KeyringGetResponse = { value: string | null };

// LLM provider key form input (renderer → Tauri command save_api_key)
type ProviderKeyEntry = {
  key:
    | 'ANTHROPIC_API_KEY' | 'ANTHROPIC_BASE_URL'
    | 'OPENAI_API_KEY'
    | 'AZURE_API_KEY' | 'AZURE_RESOURCE_NAME' | 'AZURE_OPENAI_DEPLOYMENT' | 'AZURE_API_VERSION' | 'AZURE_OPENAI_BASE_URL'
    | 'AWS_ACCESS_KEY_ID' | 'AWS_SECRET_ACCESS_KEY' | 'AWS_REGION'
    | 'OLLAMA_BASE_URL'
    | 'AGENT_PROVIDER' | 'DEFAULT_MODEL';
  value: string;
};
```

### 5.2 Endpoints

| Layer            | Method | Path                           | Auth                             | Purpose                                                       |
| ---------------- | ------ | ------------------------------ | -------------------------------- | ------------------------------------------------------------- |
| Sidecar (Bun)    | GET    | `/auth/sign-in`                | none                             | Render sign-in page (existing).                               |
| Sidecar (Bun)    | POST   | `/auth/sign-in`                | none                             | Submit credentials → Supabase → cookie + keyring write.        |
| Sidecar (Bun)    | POST   | `/auth/sign-out`               | session cookie                   | Supabase signOut + keyring DELETE.                            |
| Sidecar (Bun)    | GET    | `/internal/health`             | none                             | Tauri's server-ready TCP-then-HTTP probe target.              |
| Tauri keyring IPC | POST   | `/keyring/set`                 | `Bearer <GUEPARD_KEYRING_TOKEN>` | Write `key:value` to OS keychain.                             |
| Tauri keyring IPC | GET    | `/keyring/get?key=...`         | `Bearer <GUEPARD_KEYRING_TOKEN>` | Read by key.                                                  |
| Tauri keyring IPC | DELETE | `/keyring/{key}`               | `Bearer <GUEPARD_KEYRING_TOKEN>` | Delete by key.                                                |
| Tauri command    | (IPC)  | `save_api_key(key, value)`     | webview only                     | Renderer-driven keyring write (LLM keys).                     |
| Tauri command    | (IPC)  | `get_api_key(key)`             | webview only                     | Renderer-driven keyring read.                                 |
| Tauri command    | (IPC)  | `delete_api_key(key)`          | webview only                     | Renderer-driven keyring delete.                               |
| Tauri command    | (IPC)  | `debug_keyring_status()`       | webview only                     | Diagnostic (qwery-core lift).                                 |
| Tauri command    | (IPC)  | `get_app_config()`             | webview only                     | Read `config.json`.                                           |
| Tauri command    | (IPC)  | `set_app_config(config)`       | webview only                     | Merge-write to `config.json`.                                 |
| Tauri command    | (IPC)  | `restart_sidecar()`            | webview only                     | Kill child process, relaunch with current env.                |

### 5.3 Rate limiting, pagination, caching

- **Sidecar Supabase refresh debouncing**: single in-flight refresh per session; concurrent callers await the same promise.
- **Keyring-IPC rate cap**: 100 req/s per token; replay-detection drops requests with stale `Date` header (>5s skew).
- **Sidecar startup retry budget**: if Supabase is unreachable on boot, sidecar retries refresh 3 times with exponential backoff, then proceeds without `GUEPARD_REFRESH_TOKEN` (webview lands on sign-in).
- No pagination concerns in phase 1 (auth is request/response).

## 6. Data model

### 6.1 Schema

**No new SQL tables in phase 1.** The audit-event table that would carry `client_type` / `client_version` is owned by RFC 0016 — desktop wires emission once 0016 lands.

### 6.2 Config / payload contracts

`app_config_dir/config.json` (path resolved by `tauri::path::app_config_dir`, e.g. `~/Library/Application Support/run.guepard.desktop/config.json` on macOS):

```json
{
  "GUEPARD_SERVER_URL": "https://api.guepard.com",
  "GUEPARD_TELEMETRY_ENABLED": "true",
  "OTEL_EXPORTER_OTLP_ENDPOINT": "https://otel.guepard.com",
  "allowInsecureTls": false
}
```

MDM-delivered file is the same JSON, written under the same path before first launch.

### 6.3 Secrets contract

| Where                                        | What                                                            | Lifetime               |
| -------------------------------------------- | --------------------------------------------------------------- | ---------------------- |
| OS keychain (`SERVICE_NAME = run.guepard.desktop`) | `refresh_token:<serverUrl>` — Supabase refresh token, one per profile | Across launches; deleted on sign-out / server change |
| OS keychain                                  | `MANAGED_KEYS` LLM provider keys                                | Across launches; deleted by user via Settings        |
| Tauri shell process memory                   | Per-launch one-time keyring-IPC bearer token (`GUEPARD_KEYRING_TOKEN`) | One launch                                           |
| Sidecar process memory                       | Live Supabase access token (replaced on refresh)                | One refresh cycle (~1h)                              |
| Sidecar process memory                       | Live session cookie issued to webview                           | Webview lifetime                                     |
| `app_config_dir/config.json`                 | Server URL, telemetry toggle, `allowInsecureTls` flag           | Across launches                                      |
| `app_config_dir/desktop.log`                 | Diagnostic log (tokens / keys redacted)                         | Until rotation / user purge                          |
| `~/.guepard/storage/` (local SQLite)         | Sidecar session cache, agent transcripts, datasource connection metadata | Until user clears                                |

Tokens and keys are **never** serialised back to the renderer. The renderer sees the session only via same-origin cookies issued by the sidecar.

## 7. File-by-file work items

### 7.1 Domain (`packages/domain`)

No changes in phase 1. Auth DTOs already exist for the web build and work unchanged through the sidecar.

### 7.2 Adapters

No changes in phase 1. The renderer talks to `127.0.0.1:<port>` via the same HTTP repository factory it already uses against `apps/server` in dev. `packages/auth-client` is **not** introduced — it was a static-renderer artifact that we pivoted away from.

### 7.3 Shell runtime (`packages/shell-runtime`)

- `useRuntime()` helper returning `'web' | 'desktop'`. Reads `window.__TAURI__` presence (exposed by Tauri webview) plus optional `window.__GUEPARD_RUNTIME` injection from the sidecar.
- Optional thin wrappers around Tauri commands (`saveProviderKey`, `getProviderKey`, `deleteProviderKey`, `getAppConfig`, `setAppConfig`, `restartSidecar`) — only callable when `runtime === 'desktop'`.

### 7.4 Server (`apps/server`)

- **Desktop-sidecar build target.** Bundle `apps/server` with `bun build --compile --target=bun-<triple>` into `apps/desktop/src-tauri/binaries/api-server-<triple>[.exe]`. Targets: `aarch64-apple-darwin`, `x86_64-apple-darwin`, `x86_64-pc-windows-msvc`, `aarch64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu`. Listed in `tauri.conf.json` under `bundle.externalBin`.
- **Runtime detection.** Read `GUEPARD_RUNTIME` at boot. When `desktop`, bind `127.0.0.1` only (never `0.0.0.0`); read `GUEPARD_SERVER_URL` for the remote Supabase endpoint; read `GUEPARD_REFRESH_TOKEN` (optional) and rehydrate session before serving the first request.
- **Keyring-IPC client.** Read `GUEPARD_KEYRING_PORT` + `GUEPARD_KEYRING_TOKEN` at boot. Provide a thin `keyringClient` module with `set` / `get` / `delete` calling the Tauri shell IPC.
- **Local SQLite app-state store.** `GUEPARD_STORAGE_DIR` env var (default `~/.guepard/storage/`) for sidecar's session cache, agent transcripts, datasource metadata. Local-only, never synced.
- **No bearer-token middleware change** — the sidecar serves the renderer via same-origin cookies exactly as in web.
- **No audit-event changes in phase 1** — RFC 0016 owns that surface.

### 7.5 Presentation (`apps/web`)

- **Runtime gating.** New `useRuntime()` hook wired throughout the Settings dialog and a new top-level route guard for `/desktop/first-run`.
- **`/desktop/first-run`** — full-screen blocking page. Lives at `apps/web/src/routes/desktop/first-run.tsx`. Picker UI, TLS validation, MDM-default banner. Submits via `set_app_config` then `restart_sidecar`.
- **Settings dialog → "Server" pane** — new `SettingsSection` registered in `settings-dialog-mount.tsx` when `runtime === 'desktop'`. Shows current URL + "Change server" flow.
- **Settings dialog → "LLM keys" pane** — new `SettingsSection` registered when `runtime === 'desktop'`. Form + masked-status display per `MANAGED_KEYS` entry.
- All other auth screens (sign-in, MFA, password reset) reused unchanged — they're served by the local sidecar.
- **No separate `packages/features/auth-desktop`** — desktop-specific UI lives in `apps/web` behind runtime gates.

### 7.6 (omitted — desktop is a host, not a shell app plugin)

### 7.7 i18n (`packages/i18n` + `apps/web/src/lib/i18n/locales/en/`)

New file `apps/web/src/lib/i18n/locales/en/desktop.json` with keys grouped by area — see §11 for the flat list.

### 7.8 Desktop shell (`apps/desktop/`)

New Tauri 2 project. Replaces the stale Electron scaffold.

- `src-tauri/Cargo.toml` — mirror qwery-core's deps verbatim: `tauri = "2"`, `tauri-plugin-shell = "2"` (sidecar), `tauri-plugin-opener = "2"`, `tauri-plugin-os = "2"`, `tauri-plugin-dialog = "2"`, `keyring = "3"` with `linux-native` / `windows-native` / `apple-native` features, `serde`, `serde_json`, `dotenvy`, plus phase-1 additions: a small HTTP server crate (`tiny_http` or `hyper`) for the keyring IPC listener, `rand` for the one-time IPC token.
- `src-tauri/tauri.conf.json` — **no `frontendDist`**; webview loads `http://127.0.0.1:<port>` via `window.__GUEPARD_API_URL` injection. App identifier `run.guepard.desktop`. `bundle.externalBin` lists `binaries/api-server` per supported triple.
- `src-tauri/capabilities/default.json` — grants: shell-sidecar (bun + api-server), opener, dialog. No shell-execute beyond the allowlisted sidecar.
- `src-tauri/src/lib.rs` — lifted verbatim from qwery-core `lib.rs` with `SERVICE_NAME = "run.guepard.desktop"` and the guepard `MANAGED_KEYS` / `CONFIG_KEYS`. Retains: `target_triple()`, `configure_webview_zoom()`, `pick_port(4096)`, PID file, `kill_previous_api_server`, Windows env-subset (PATH/SystemRoot/TEMP/TMP/USERPROFILE/LOCALAPPDATA/APPDATA + `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0`), env injection from keyring + `config.json`, server-ready TCP loop, child kill on window close + `before-quit`, `append_log_line` to `app_config_dir/desktop.log`. **Adds:** keyring IPC bind + one-time token generation, `GUEPARD_REFRESH_TOKEN` injection at sidecar spawn.
- `src-tauri/src/keyring_cmds.rs` — `save_api_key` / `get_api_key` / `delete_api_key` / `debug_keyring_status` lifted from qwery-core (Windows legacy-target migration retained).
- `src-tauri/src/config_cmds.rs` — `get_app_config` / `set_app_config` for `app_config_dir/config.json`.
- `src-tauri/src/ipc.rs` — keyring-IPC HTTP server. Endpoints `POST /keyring/set` / `GET /keyring/get` / `DELETE /keyring/{key}`. Bearer-token auth using `GUEPARD_KEYRING_TOKEN`. Rate cap.
- `src-tauri/src/restart.rs` — `restart_sidecar` Tauri command; kills the child, respawns with current env (re-reads keyring + config first).
- `apps/desktop/package.json` — scripts `tauri:dev` (depends on `pnpm --filter server build:desktop` + `pnpm --filter web dev`), `tauri:build` (depends on both web and server builds), `tauri:package` (full installer).
- **Delete:** `apps/desktop/electron/` directory, `apps/desktop/electron-builder.yml`, electron-related entries in `apps/desktop/package.json` (`electron`, `electron-builder`, `concurrently`, `nodemon`, `wait-on`, `cross-env`, scripts `compile` / `start:electron` / `prepare:renderer` / `build` electron flow).

**`MANAGED_KEYS`** (Rust constant):
```rust
const MANAGED_KEYS: &[&str] = &[
    "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL",
    "OPENAI_API_KEY",
    "AZURE_API_KEY", "AZURE_RESOURCE_NAME", "AZURE_OPENAI_DEPLOYMENT",
    "AZURE_API_VERSION", "AZURE_OPENAI_BASE_URL",
    "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION",
    "OLLAMA_BASE_URL",
    "AGENT_PROVIDER", "DEFAULT_MODEL",
];
```

**`CONFIG_KEYS`**:
```rust
const CONFIG_KEYS: &[&str] = &[
    "GUEPARD_SERVER_URL",
    "GUEPARD_TELEMETRY_ENABLED",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
];
```
(`allowInsecureTls` lives in `config.json` but is read directly by the sidecar, not env-injected.)

## 8. Permissions and RLS

No new tables, so no new RLS policies. The existing RLS on Supabase tables continues to govern what the sidecar can read on behalf of the user — unchanged.

## 9. Security checklist

- [ ] Same-origin webview ↔ sidecar at `127.0.0.1:<port>` (cookies scoped to that origin, never leave host).
- [ ] Sidecar binds `127.0.0.1` only — assert in `apps/server` startup when `GUEPARD_RUNTIME=desktop`.
- [ ] Keyring-IPC authenticated by per-launch one-time bearer token (`GUEPARD_KEYRING_TOKEN`); token never logged.
- [ ] Keyring-IPC rate-capped + clock-skew-checked (replay defence).
- [ ] Refresh token + LLM keys redacted from all logs (extend `append_log_line` filter list).
- [ ] HTTPS-only remote server URLs in production. `allowInsecureTls` requires explicit opt-in via `config.json`; production builds emit startup warning + Settings UI banner whenever it's on.
- [ ] OS keychain only — no fallback to plaintext file when keyring is unavailable; user is forced to re-auth that session.
- [ ] Tauri capabilities (`capabilities/default.json`) grant only what's listed in §7.8.
- [ ] MDM `config.json` integrity is **NOT** verified in phase 1 — documented as "trust the OS file-permission boundary"; revisit in a later phase if customers want signed config.
- [ ] System-browser handoff for OAuth providers is deferred — no in-webview third-party OAuth screens.
- [ ] Residual threats called out: compromised host with keychain access, malicious local process scanning loopback ports (mitigated by IPC token check + binding `127.0.0.1` only).

## 10. Verification plan

### 10.1 Static checks

`pnpm typecheck`, `pnpm lint`, `cargo clippy` (in `apps/desktop/src-tauri/`), `cargo fmt --check`.

### 10.2 Unit tests

- **Rust** (`src-tauri`): keyring command success/failure paths with mock `keyring::Entry`; `pick_port` fallback when 4096 is busy; IPC token-auth round-trip (correct token → 200, wrong token → 401, missing token → 401); `MANAGED_KEYS` env-injection ordering deterministic; `config.json` parser round-trip (valid → struct → JSON → struct equal).
- **Bun/TS** (`apps/server` desktop-runtime tests): startup logic when `GUEPARD_RUNTIME=desktop` (binds 127.0.0.1, reads `GUEPARD_REFRESH_TOKEN` env, calls Supabase refresh, writes new token back via keyring IPC). Mock the IPC server with `msw` or a small stub.

### 10.3 Integration tests

Full launch test in `apps/desktop/src-tauri/tests/`:
- Spawn the sidecar binary against `wiremock-rs` posing as Supabase.
- Seed a temp keyring with a refresh token.
- Assert sidecar boots, exchanges, writes back via IPC, and serves an authenticated request to a fake webview HTTP client.
- Cross-platform CI matrix: macOS (arm64 + x86_64), Windows, Linux.

### 10.4 End-to-end (Playwright)

- Tauri WebDriver e2e is genuinely hard to set up — defer real e2e to a later phase.
- For phase 1, add `apps/web` Playwright tests that stub `window.__TAURI__` + `window.__GUEPARD_RUNTIME='desktop'` and exercise: first-run picker visibility, Server pane visibility, LLM keys pane visibility, runtime-gated routing.

### 10.5 Manual smoke

```bash
# build sidecar binary for current triple
pnpm --filter server build:desktop
# run Tauri in dev (uses apps/web Vite dev server)
pnpm --filter desktop tauri:dev
```

Then by hand:
1. Fresh launch (delete `app_config_dir/config.json` first) → first-run picker appears full-screen.
2. Pick Cloud → sidecar restarts → land on sign-in → sign in → home loads.
3. Quit app, relaunch → no sign-in screen, sees authenticated home directly.
4. Settings → LLM keys → set `OPENAI_API_KEY` → Save → click "Restart sidecar" → verify env var present in `desktop.log`.
5. Settings → Server → "Change server" → enter local Supabase URL (`http://127.0.0.1:54321`) → confirm warning → first-run picker reappears with new URL pre-selected → sign in → success.
6. Verify keychain via `security find-generic-password -s run.guepard.desktop` (macOS) — see `refresh_token:<serverUrl>` entries per profile.
7. Sign-out → verify `refresh_token:*` entries gone from keychain.
8. Set `allowInsecureTls: true` in `config.json` → verify Settings banner appears + `desktop.log` startup warning.

## 11. i18n key map

New file `apps/web/src/lib/i18n/locales/en/desktop.json`:

```json
{
  "firstRun": {
    "title": "Choose a server",
    "subtitle": "Select where this app should connect.",
    "cloudOption": "Cloud (guepard.com)",
    "cloudDescription": "Connect to Guepard's hosted service.",
    "customOption": "Custom server URL",
    "customDescription": "Connect to your organization's deployment.",
    "urlPlaceholder": "https://guepard.your-company.com",
    "urlInvalid": "Enter a valid HTTPS URL.",
    "mdmBanner": "Your IT team configured this URL.",
    "continue": "Continue"
  },
  "settings": {
    "server": {
      "title": "Server",
      "currentLabel": "Connected to",
      "mdmBadge": "Set by your IT team",
      "changeAction": "Change server",
      "changeWarningTitle": "Sign out and change server?",
      "changeWarningBody": "This will sign you out, clear local credentials for the current server, and connect to a new one.",
      "changeWarningConfirm": "Sign out and change",
      "changeWarningCancel": "Cancel",
      "newUrlLabel": "New server URL",
      "tlsInsecureBanner": "Insecure TLS allowed — for development only. Disable allowInsecureTls in config.json before production use."
    },
    "llmKeys": {
      "title": "LLM provider keys",
      "subtitle": "Stored in your OS keychain. Never leaves this device.",
      "statusSet": "Set",
      "statusNotSet": "Not set",
      "actionSet": "Set",
      "actionReplace": "Replace",
      "actionDelete": "Delete",
      "saveModalTitle": "Set {{providerName}}",
      "saveModalLabel": "Value",
      "saveAction": "Save",
      "deleteConfirmTitle": "Delete {{providerName}}?",
      "deleteConfirmBody": "The key will be removed from the OS keychain.",
      "restartHint": "Restart the sidecar to apply.",
      "restartAction": "Restart sidecar"
    }
  },
  "errors": {
    "keyringUnavailable": "Could not access OS keychain — sign-in required this session.",
    "sidecarFailed": "Could not start the local server. See {{logPath}} for details.",
    "tlsFailed": "Could not establish a secure connection to {{url}}.",
    "mdmConfigInvalid": "Your MDM-supplied configuration could not be read; falling back to the standard picker."
  }
}
```

## 12. Implementation sequencing

Stage A — Tauri shell + sidecar foundation
- Stand up `apps/desktop/src-tauri/` by lifting qwery-core's `lib.rs` (sidecar spawn, `pick_port`, PID file, kill-previous, Windows env-subset, server-ready TCP loop, log helper). Delete the Electron scaffold.
- `Cargo.toml` with the full Tauri 2 + keyring + `tauri-plugin-shell` dep set, plus the small HTTP crate for keyring IPC.
- `tauri.conf.json` without `frontendDist`, with `externalBin` listing `binaries/api-server` per triple.
- `capabilities/default.json` with minimum grants.

Stage B — Sidecar build pipeline
- `apps/server` gains a `build:desktop` script: `bun build --compile --target=bun-<triple>` → `apps/desktop/src-tauri/binaries/api-server-<triple>[.exe]` per target triple.
- `apps/server` reads `GUEPARD_RUNTIME=desktop` at boot — binds `127.0.0.1` only, reads `GUEPARD_SERVER_URL`, reads `GUEPARD_STORAGE_DIR`.

Stage C — Keyring IPC + BYO LLM keys + config
- Rust keyring commands (`save_api_key` / `get_api_key` / `delete_api_key` / `debug_keyring_status`) with `MANAGED_KEYS`. Windows legacy-target migration retained.
- Rust config commands (`get_app_config` / `set_app_config`) for `CONFIG_KEYS` + `allowInsecureTls`.
- Rust keyring-IPC HTTP server: `/keyring/set` / `/keyring/get` / `/keyring/{key}` with `GUEPARD_KEYRING_TOKEN` bearer auth + rate cap.
- `apps/server` keyring-IPC client: read `GUEPARD_KEYRING_PORT` + `GUEPARD_KEYRING_TOKEN`, expose `keyringClient.{set,get,delete}`.
- `apps/web` Settings → LLM keys pane (gated by `runtime === 'desktop'`).

Stage D — Auth wiring + first-run + server switcher
- `apps/server` boot path: read `GUEPARD_REFRESH_TOKEN`, refresh against Supabase, write new token back via `keyringClient.set`.
- `apps/server` sign-in handler: write `refresh_token:<serverUrl>` via `keyringClient.set` after Supabase response.
- `apps/server` sign-out handler: `keyringClient.delete('refresh_token:<serverUrl>')` after Supabase signOut.
- Tauri `restart_sidecar` command + supporting kill-and-respawn logic.
- `apps/web` `/desktop/first-run` route + Settings → Server pane (both gated by `runtime === 'desktop'`).
- `useRuntime()` hook in `packages/shell-runtime`.
- i18n `desktop.json` namespace with all keys from §11.

Stage E — Polish, verification, docs
- Manual smoke against cloud + local Supabase per §10.5.
- Rust unit + integration tests per §10.2 / §10.3.
- Cross-platform CI matrix (macOS arm64+x86_64, Windows, Linux).
- Document MDM `config.json` format for enterprise IT (in repo `docs/desktop-mdm.md`).
- Verify sidecar graceful shutdown on window close + `before-quit`, PID cleanup across platforms.
- Confirm `allowInsecureTls` startup warning + Settings banner wiring.

## 13. Follow-ups (deferred, not in this phase)

- OAuth provider sign-in (Google / GitHub / SAML) via PKCE + system browser + loopback handoff.
- Audit-event wiring (`client_type` / `client_version`) once RFC 0016 lands.
- Cloud LLM proxy + `guepardCloud()` `LanguageModelV2` provider — replaces BYO keys for hosted users.
- Better Auth swap (post-RFC-0012), refresh-token reuse detection.
- Hard MDM enforcement (`enforceEnterprise` lock — cloud option hidden, Settings server-switcher read-only).
- Multi-profile switcher within a single install.
- `guepard://` custom protocol handler.
- Certificate pinning for on-prem.
- Device attestation / binding.
- Real Tauri WebDriver e2e suite.
- MDM `config.json` integrity verification (signed config support).

---

## Changelog

One line per deviation from this spec discovered during implementation.
