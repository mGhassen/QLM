---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - apps/web/src/features/desktop-server/server-pane.tsx
  - apps/web/src/features/desktop-server/server-pane.stories.tsx
  - apps/web/__tests__/features/desktop-server/server-pane.test.tsx
validation:
  kind: typecheck-only
---

# Add server-pane component

Build the desktop "Server" Settings pane. The component reads the current server URL via `getAppConfig()`, surfaces the MDM badge if the URL was IT-supplied, opens a confirm dialog before any change, drives the sign-out → `setAppConfig` → `restartSidecar` flow, and shows a persistent `tlsInsecureBanner` when `allowInsecureTls === 'true'`.

## Done when

- [ ] `apps/web/src/features/desktop-server/server-pane.tsx` exports `<ServerPane />` (props: `Readonly<{}>` — host has no overrides). Internally:
  - Loads `getAppConfig()` once on mount via `useQuery` (key: `['desktop', 'app-config']`); shows a skeleton until ready.
  - Renders the current URL (mono font), with the `mdmBadge` chip only when `config.QLM_SERVER_MDM_DEFAULT === config.QLM_SERVER_URL`.
  - Renders the `tlsInsecureBanner` `<Alert variant="warning">` only when `config.allowInsecureTls === 'true'`.
  - "Change server" button → `<AlertDialog>` with the warning title/body/confirm/cancel keys.
  - On confirm, opens an `<Input>` for the new URL with HTTPS validation (re-uses `isHttpsUrl` shared with the first-run picker — extract to `apps/web/src/lib/url.ts` if not already shared, but inline-extract is fine for a single caller).
  - On submit: `await fetch('/auth/sign-out', { method: 'POST', credentials: 'include' })` (best-effort; ignore non-2xx) → `await setAppConfig({ QLM_SERVER_URL: <new> })` → `await restartSidecar()` → `window.location.assign('/')`.
  - All visible strings via `t('desktop.settings.server.*')`.
- [ ] `server-pane.stories.tsx` covers four states: `cloud-connected`, `on-prem-connected`, `mdm-default`, `allow-insecure-tls`. Each story stubs `getAppConfig` via a `Provider` shim or a Storybook decorator that mocks `@qlm/shell-runtime`.
- [ ] `apps/web/__tests__/features/desktop-server/server-pane.test.tsx` covers:
  - Renders current URL + opens dialog on "Change server".
  - Cancel button closes dialog without calling `setAppConfig` / `restartSidecar`.
  - Happy path: confirm + valid HTTPS URL → fetch sign-out called, `setAppConfig` called, `restartSidecar` called, `window.location.assign` called with `/`.
  - HTTP URL → input validation surfaces `urlInvalid`, submit disabled.
  - `allowInsecureTls === 'true'` → banner visible.
  - MDM badge visible only when MDM URL matches current URL.
- [ ] `pnpm typecheck` green; `pnpm --filter web test __tests__/features/desktop-server/server-pane.test.tsx` green.

## Notes

- Reuse `Alert`, `Button`, `AlertDialog`, `Input`, `Label`, `Card` from `@qlm/ui/*`.
- Storybook validation is mandatory per `.claude/rules/testing.md` — the human-approval gate will run `pnpm --filter web storybook` to eyeball all four states.
- Spec anchor: `#75-presentation-appsweb` (Settings dialog → "Server" pane bullet).
