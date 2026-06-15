# Spec — Token management (phase 1)

| Field        | Value                                                                |
| ------------ | -------------------------------------------------------------------- |
| Status       | Shipped — 2026-04-16                                                 |
| Author       | Hani Chalouati                                                       |
| Created      | 2026-04-14                                                           |
| Implements   | [RFC 0009 — Token management](../rfcs/0009-token-management.md)      |
| Target phase | Phase 1                                                              |
| Stories      | [`docs/stories/0009/phase1/`](../stories/0009/phase1/)               |

This document is the implementation spec for RFC 0009 phase 1. The RFC establishes the *why* and *shape*; this spec defines the *what* and *how*: resolved open questions, exact data shapes, functional flows, file-by-file work items, and a verification plan.

Scope is strict to phase 1 of RFC 0009 as amended by **AM-1 (2026-04-14)**: a **Settings dialog** opened from the account-menu "Settings" entry, with a two-pane shell whose left nav contains "Personal tokens" (the only section in phase 1) and whose right outlet renders the tokens UI as **inline panes** (no nested dialogs). Plus the three session-gated `/user-tokens/*` endpoints on `apps/server`, the Bearer-token validation middleware intended for the public-API surface (delivered here as a reusable middleware module; its deployment in `guepard-public-api` is cross-repo coordination per §1 Q2), the domain entity + Zod schemas + repository port, and the i18n namespaces (`tokens.*` + `settings.*`). Everything else is deferred to RFC 0009 phase 2–4 or to other RFCs.

**Pointer to the amendment**: RFC 0009 `## Amendments` §AM-1 overrides the RFC body wherever the two disagree. The body still says "Route `/user/tokens`"; AM-1 reroutes that to a Settings dialog. This spec follows AM-1.

**A critical note on scope**: the `public.user_tokens` table and its four RLS policies **already exist** in `apps/web/supabase/schemas/41-platform-settings-and-tokens.sql` and `42-platform-rls.sql`. Phase 1 writes **no new migration**, adds **no new enum value**, and adds **no new RLS policy**. The schema is the contract; this spec consumes it.

---

## 1. Resolved open questions

| # | Question (from RFC §11) | Resolution for phase 1 |
|---|---|---|
| 1 | Revoke endpoint shape | **`POST /user-tokens/:id/revoke`** — verb-as-path. Surfaces the soft-revoke semantics in the URL. Request body empty. Response: the updated `UserToken` row. |
| 2 | Cross-repo coordination with `guepard-public-api` | **Coordinated release.** `guepard-public-api` ships a one-line query update (from `guepard.gp_user_tokens` to `public.user_tokens`) in the same release window as v3 phase 1. Column names (`account_id`, `token_name`, `scopes`, `expires_at`, `revoked`) are identical so only the schema-qualified table name changes. No dual-reading or flag window is needed. The coordination is tracked as a follow-up ticket in `guepard-public-api` linked from this spec. |
| 3 | Sidebar entry point for token management | **Account-menu "Settings" entry opens a Settings dialog.** Per RFC 0009 AM-1 (2026-04-14), the token UI is not a standalone route in phase 1. The account menu (present in both `UserProfileMenu` for the organizations layout and `ShellUserProfileMenu` for the project shell) shows a **"Settings"** item. Clicking it opens a Radix `Dialog` with a two-pane layout: left nav listing sections (only "Personal tokens" in phase 1), right outlet rendering the selected section. No `/user/tokens` or `/user/settings` route is added. |
| 4 | Curl example in post-creation reveal dialog | **Yes — one copyable example.** After a token is created the reveal dialog shows both the raw JWT and a `curl -H "Authorization: Bearer <token>" https://<public-api-host>/...` one-liner with a copy button. The host placeholder comes from an env-provided config value (`VITE_GUEPARD_PUBLIC_API_URL` or equivalent — spec does not add a new env var; it reuses whatever value is already exposed to the web app). |
| 5 | `revoked` column nullability handling | **Tolerate at the read-path, harden later.** The landed DB has `revoked boolean default false` with no `NOT NULL`. Phase 1 Zod read-schemas normalise `null` → `false` via `.nullable().transform(v => v ?? false)` so service code treats `revoked` as strictly boolean. A hardening migration (`ALTER COLUMN revoked SET NOT NULL`) is filed as a phase-2 follow-up (RFC 0009 §10 rollout, phase-2 row). Phase 1 **does not** add a migration. |

## 2. User stories

- **As a signed-in user**, I can open the account dropdown in the top-right and click "Access tokens" to land at `/user/tokens`.
- **As a signed-in user**, I can see every token I own in a table with columns Name, Expires, Status, Created At, Revoked At, Scopes, Actions — matching `docs/rfcs/0009-token-management/token-list.png`.
- **As a signed-in user**, I can search tokens by name (client-side filter over the already-fetched list), filter by status (active / expired / revoked), and filter by scope (read / write / admin).
- **As a signed-in user**, I can click "Generate Token" to open a creation dialog with a required Name field, Read / Write / Admin scope checkboxes (at least one required), and an expiration date picker (default 90 days from today, max 365 days). A live preview panel on the right reflects my choices.
- **As a signed-in user**, when I submit the creation form I see the raw JWT exactly once in a reveal view with a copy-button and an unmissable "this token will not be shown again" warning. The reveal view also shows a copyable curl snippet I can paste into a terminal.
- **As a signed-in user**, I can revoke any active token I own via the revoke icon on its row. A confirmation dialog warns me that processes using it will stop working. On confirm the row flips to Revoked status with a timestamp; the row stays visible as an audit record.
- **As a CLI / CI / script caller**, I can present my JWT as `Authorization: Bearer <jwt>` against any `guepard-public-api` endpoint and have it verified — signature (HS256 against shared `JWT_SECRET`), DB revocation check (row in `public.user_tokens` by `token_id` claim, `revoked` must be `false` and `expires_at > now()`), and method-based scope enforcement (`admin` → any method, `read` → GET only, `write` → POST/PUT/DELETE only).
- **As a user whose `auth.users` row is deleted**, all my tokens are automatically purged (via the cascade chain `auth.users → public.accounts → public.user_tokens`).
- **As a developer running `pnpm web:dev`**, I can click through the full create → reveal → copy → revoke flow end-to-end against a real local database (because the schema is already landed).
- **As a developer of `guepard-public-api`**, I can drop in the Bearer-token middleware module this spec delivers and the only code change on my side is a one-line SQL-query update.

## 3. Functional flow

### 3.1 Information architecture

Per RFC 0009 AM-1 (2026-04-14), phase 1 **adds no new route**. The token UI lives inside a Settings dialog that opens from the account menu.

- **Entry point**: the "Settings" item on the account menu (`UserProfileMenu` in the organizations layout; `ShellUserProfileMenu` in the project shell). Clicking it opens `<SettingsDialog open={true} />` — a Radix `Dialog` overlaid on whatever page the user is currently on.
- **Relationship to existing areas**: nothing. Settings is a modal overlay — it does not affect URL, does not change browser history, and does not require the user to leave their current page.
- **No `/user/*` routes in phase 1**. Any URLs referencing the old `/user/tokens` proposal are removed. Future RFCs may introduce `/user/settings/*` routes when multiple settings sections justify a full page; phase 1 is a single-section dialog.
- **The dialog is a leaf**: no sub-dialogs, no nested modals. All token flows (create, reveal, revoke-confirm) render as inline pane states inside the dialog's right-side outlet.

### 3.2 Screen-by-screen

#### 3.2.1 Settings dialog — shell

- **Opens from** both account-menu components (`UserProfileMenu`, `ShellUserProfileMenu`) via a new `onSettingsClick` handler. The existing (unused) gear-icon `onSettingsClick` prop on both components is **renamed to `onProfileSettingsIconClick`** to free the name — a one-commit change in `@guepard/ui`. Both menus get a new "Settings" nav-item button (distinct from the unused gear icon) that calls the new handler.
- **Layout**: Radix `Dialog` with `max-w-4xl` (roughly). Two columns:
  - **Left nav (`~220px`)**: vertical list of section items. Phase 1 has exactly one item: "Personal tokens" (from `settings.nav.personalTokens`). Active state on the currently-selected section. Scrollable if sections overflow (won't in phase 1).
  - **Right outlet**: renders the currently-selected section's content component. In phase 1 this is `<TokensSettingsPane />`. The outlet fills remaining width.
- **Header**: small header inside the dialog — `settings.dialog.title` ("Settings") + a Close button (X). Close also bound to `Escape`.
- **Section-switch state**: `useState<SettingsSectionKey>('personal-tokens')`. `SettingsSectionKey = 'personal-tokens'` in phase 1 (union grows in later RFCs).
- **Open state**: controlled by the caller via `open` / `onOpenChange` props — the account-menu components pass through a parent-held boolean.
- **Close behaviour**: clicking the X, Escape, or the overlay closes. Closing while the tokens pane is in a non-list state (e.g. "create form" mid-entry) shows a native browser `confirm()` "Discard unsaved changes?" guard. If confirmed or if the pane state is `"list"` / `"reveal"` / `"revoke-confirm"`, the dialog closes.

Component props:

```ts
type SettingsDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSection?: SettingsSectionKey; // default 'personal-tokens'
}>;

type SettingsSectionKey = 'personal-tokens';
```

#### 3.2.2 Tokens settings pane — list state

Matches `docs/rfcs/0009-token-management/token-list.png` (minus the page-level chrome — the pane lives inside the dialog's right outlet).

- **Header** (inside the pane, above the toolbar): `tokens.page.title` + `tokens.page.subtitle`.
- **Toolbar** (left-to-right):
  - Search input, placeholder from `tokens.toolbar.searchPlaceholder`. Filters the list by `token_name` (case-insensitive substring) client-side.
  - Status filter popover: three checkboxes (active / expired / revoked). Label from `tokens.toolbar.status`. Filter is client-side.
  - Scopes filter popover: three checkboxes (read / write / admin). Label from `tokens.toolbar.scopes`. Filter is client-side; matches tokens whose `scopes` array contains **any** of the selected values.
  - "Generate Token" primary button (label from `tokens.toolbar.generate`). Clicking **swaps the pane state** to `"create"` — **does not open a new dialog**.
- **Table** (columns in order): Name, Expires, Status, Created At, Revoked At, Scopes, Actions.
  - Name → `token_name`. Sortable.
  - Expires → `expires_at` rendered as a localized date (`dateFnsFormat(new Date(expires_at * 1000), ...)`). Sortable by numeric value.
  - Status → derived (`active` / `expired` / `revoked`). Sortable by a stable ordering (active first, then expired, then revoked).
  - Created At → `created_at`, sortable.
  - Revoked At → `revoked_at` or a localized "N/A" (`tokens.table.notApplicable`) when null. Sortable.
  - Scopes → one colored pill per scope, always in order `read / write / admin`.
  - Actions → revoke icon button (disabled for non-active rows). Clicking swaps the pane state to `"revoke-confirm"` with the target token id held in state.
- **Empty state**: illustration, heading `tokens.empty.heading`, body `tokens.empty.body`, primary button `tokens.empty.action` that swaps pane state to `"create"`.
- **Loading state**: six skeleton rows.
- **Error state**: inline error component with retry — `tokens.errors.listHeading`, `tokens.errors.retry`.

#### 3.2.3 Tokens settings pane — "create" state (inline form)

Replaces the pane's "list" state. Content-only — **no `Dialog` wrapper**.

Matches the left-side form + right-side preview layout of `docs/rfcs/0009-token-management/generate-token.png`. The component is `<GenerateTokenForm />` (not `<GenerateTokenDialog />`).

- **Pane header**: a back button (←) + title `tokens.dialog.generate.title`. Clicking back swaps the pane state to `"list"` (with a `confirm()` guard if the form is dirty).
- **Two-column layout**: form on the left, live preview on the right. Same form fields as before (Name, Scopes, Expiration Date), same validation, same 90-day default + 365-day cap.
- **Footer (inside the pane)**: Cancel (swaps to `"list"`, with guard) + Create Token (primary, submits the mutation).
- **On submit**: POST `/user-tokens`. On success, the pane state swaps to `"reveal"` with the `rawJwt` and `row` stored in pane state. On error, inline error banner at the top of the pane.

#### 3.2.4 Tokens settings pane — "reveal" state (inline, one-time)

Replaces the pane's "create" state after a successful POST. Content-only — `<RevealTokenView />` component.

- **Pane header**: title `tokens.dialog.reveal.heading`.
- **Banner**: `tokens.dialog.reveal.warning` — styled prominently.
- **Raw JWT field**: monospace read-only input with copy button. Toast success via `tokens.dialog.reveal.copied`.
- **Curl example field**: monospace read-only input containing `curl -H "Authorization: Bearer <jwt>" ${publicApiUrl}` with the real JWT substituted inline. `publicApiUrl` from `VITE_GUEPARD_PUBLIC_API_URL`.
- **Footer**: a single Close button `tokens.dialog.reveal.close` that swaps pane state back to `"list"`. Closing the outer Settings dialog also transitions back to `"list"` first (so re-opening the dialog never re-shows the JWT).
- **Security**: closing drops the `rawJwt` from pane state; it is never persisted anywhere (no clipboard, no sessionStorage, no URL).

#### 3.2.5 Tokens settings pane — "revoke-confirm" state (inline-modal)

Replaces the pane content with a centered confirmation block — **not a stacked dialog**. Content-only — `<RevokeConfirmInline />` component.

- Visual: an alert-style box in the middle of the pane (80% width) with a heading (`tokens.dialog.revoke.heading`), body copy (`tokens.dialog.revoke.body`), and two buttons.
- **Buttons**: Cancel (swaps to `"list"`) + Revoke (destructive, fires the mutation). On success, swaps to `"list"` with the revoked row now showing Revoked status.
- **Important**: this inline-modal state is visually distinct from a Radix `Dialog` — it lives inside the pane's flow, not as an overlay. Still uses `role="alertdialog"` + `aria-modal="true"` for a11y.

#### 3.2.6 Pane-state state machine (summary)

```
                  ┌────────────────────────────┐
                  │                            │
                  ▼                            │ (after Create Token / Close / Cancel)
┌──────┐  Generate Token  ┌────────┐  submit  ┌────────┐
│ list │ ────────────────►│ create │ ────────►│ reveal │
└──────┘                  └────────┘          └────────┘
  │  ▲                       │                      │
  │  │ revoke success        │ back / cancel        │ close
  │  │                       ▼                      │
  │  │                    ┌──────┐                  │
  │  └────────────────────┤ list │◄─────────────────┘
  │                       └──────┘
  │ revoke icon click (with target token id)
  ▼
┌────────────────┐
│ revoke-confirm │ ──── cancel ──── ► list
└────────────────┘
        │
        │ revoke submit (success)
        ▼
      list
```

Exactly one pane state is visible at a time. Transitions are driven by a `useReducer` inside `<TokensSettingsPane />`.

### 3.3 User flows (happy paths)

**Flow A — generate a token**:

1. User clicks "Settings" on the account menu (from anywhere — organizations layout, project shell, or a project page).
2. `SettingsDialog` opens. Left nav shows "Personal tokens" (selected). Right outlet renders `<TokensSettingsPane />` in `"list"` state.
3. `TokensSettingsPane` fetches via TanStack Query (`queryFn: listUserTokens`).
4. User clicks "Generate Token" in the pane toolbar. Pane state swaps `"list"` → `"create"` (no new Dialog opens).
5. User fills Name ("CLI"), checks Read + Write, picks expiration (default: today + 90 days).
6. User clicks Create Token. Client POSTs `/user-tokens` with `{ token_name, scopes, expires_at }` where `expires_at` is `Math.floor(Date.parse(picked) / 1000)` (Unix seconds).
7. Server validates, inserts row, signs JWT, returns `{ row: UserToken, rawJwt: string }`.
8. Pane state swaps `"create"` → `"reveal"` with `rawJwt` displayed inline.
9. User clicks the copy button on the curl snippet, pastes it into a terminal, confirms it works against the public API.
10. User clicks Close (inside the pane, not the Dialog). Pane state swaps `"reveal"` → `"list"`. List query invalidates + re-fetches; the new token appears. The Settings Dialog itself stays open until the user dismisses it separately.

**Flow B — revoke a token**:

1. From the `"list"` pane state inside the Settings dialog, user clicks the revoke icon on a row.
2. Pane state swaps `"list"` → `"revoke-confirm"` with the target token id in state (no new Dialog opens).
3. User clicks Revoke in the inline-modal block.
4. Client POSTs `/user-tokens/:id/revoke`. Server flips `revoked = true`, `revoked_at = now()`, returns the updated row.
5. Pane state swaps `"revoke-confirm"` → `"list"`. List invalidates and re-fetches. The row now shows Status = Revoked, Revoked At = a timestamp.

**Flow C — non-interactive validation (out of this repo, in `guepard-public-api`)**:

1. CLI sends `GET /some-endpoint` with `Authorization: Bearer <jwt>`.
2. The public-API's Bearer middleware verifies HS256 against `JWT_SECRET`.
3. Middleware reads `token_id` from claims, looks up `public.user_tokens` where `id = token_id`.
4. If `revoked = true` OR `expires_at * 1000 < Date.now()` → reject 401 / 403.
5. If scopes don't permit the HTTP method → reject 403.
6. Otherwise attach `{ accountId, userId, scopes }` to the request context and proceed.

### 3.4 Error and edge-case behaviour

- **Creation validation (server-side)**:
  - Empty/whitespace-only `token_name` → 400 `tokens.errors.invalidName`.
  - `scopes` empty or contains unknown values → 400 `tokens.errors.invalidScopes`.
  - `expires_at - nowUnix > 365 * 86400` → 400 `tokens.errors.expirationTooFar`.
  - `expires_at <= nowUnix` → 400 `tokens.errors.expirationInPast`.
- **Revoke on non-existent id** → 404 `tokens.errors.notFound`.
- **Revoke on already-revoked token** → 409 `tokens.errors.alreadyRevoked`. UI: the revoke icon on that row was disabled; this 409 is defensive.
- **Session expired mid-action** → 401. Client redirects to sign-in and preserves the intended return URL.
- **Concurrent revocations** (rare) → whichever wins updates the row; the second one returns 409 which the UI treats as success (the net state is what the user wanted).
- **DB returns `revoked = null`** (shouldn't happen with `default false` but is tolerated): the Zod schema normalises to `false` via `.nullable().transform(v => v ?? false)`. See §1 Q5.

## 4. Technical flow

### 4.1 Layered sequence diagrams

**Sequence — generate a token**:

```
Browser (user clicks Create Token)
     │  POST /user-tokens { token_name, scopes, expires_at }
     ▼
apps/server/src/routes/user-tokens.ts
     │  zValidator('json', CreateUserTokenInputSchema)
     │  getCurrentAccount(c) → { accountId }
     ▼
CreateUserTokenService (packages/domain)
     │  validate: expiration cap, scope set
     │  repo.create({ accountId, tokenName, scopes, expiresAt })
     ▼
IUserTokenRepository (abstract port)
     ├─ SupabaseUserTokenRepository (real)
     │   INSERT INTO public.user_tokens ... RETURNING *
     │   ← row returned
     ▲
     │  row
     │
     │  signJwt({ token_id: row.id, sub: accountId, scopes, exp: expiresAt, aud: 'authenticated', role: 'authenticated' }, JWT_SECRET, HS256)
     │  → rawJwt
     │
     ▼
{ row: UserTokenOutput, rawJwt: string }
     │
     ▼
HTTP 201 response
```

**Sequence — revoke a token**:

```
Browser → POST /user-tokens/:id/revoke
     │
     ▼
apps/server/src/routes/user-tokens.ts
     │  getCurrentAccount(c) → { accountId }
     ▼
RevokeUserTokenService
     │  repo.revoke(id, accountId)   // id + accountId ensures ownership at the adapter level in addition to RLS
     ▼
SupabaseUserTokenRepository
     │  UPDATE public.user_tokens SET revoked = true, revoked_at = now()
     │  WHERE id = $id AND account_id = $accountId AND revoked = false
     │  RETURNING *
     │
     │  if 0 rows returned → throw TokenNotFoundOrAlreadyRevoked
     ▼
HTTP 200 with updated row, or 404 / 409
```

**Sequence — validate a Bearer token (in `guepard-public-api`, after the middleware module lands there)**:

```
Incoming request: Authorization: Bearer <jwt>
     │
     ▼
bearerTokenMiddleware (module from this spec)
     │  verifyJwt(rawJwt, JWT_SECRET, { algorithms: ['HS256'] })
     │  → { token_id, sub, scopes, exp }
     │
     │  SELECT revoked, expires_at FROM public.user_tokens WHERE id = token_id
     │  if revoked || expires_at * 1000 < Date.now() → 401
     │
     │  scopePermitsMethod(scopes, req.method) ?
     │     yes → attach { accountId: sub, scopes } to context; next()
     │     no  → 403
```

### 4.2 Component split

- **`packages/domain`** — `UserTokenEntity`, `IUserTokenRepository` (port), `CreateUserTokenService`, `RevokeUserTokenService`, `ListUserTokensService`, Zod schemas + DTOs. Pure TypeScript.
- **`packages/repositories/supabase`** — `SupabaseUserTokenRepository` implementing the port against `public.user_tokens`.
- **`apps/web/src/lib/repositories`** — `HttpUserTokenRepository` implementing the port against the v3 server (`/user-tokens/*`). Used by the web app's factory.
- **`apps/server/src/routes`** — `user-tokens.ts` with 3 handlers. Uses the Supabase repository (via `getRepositories(c).userToken`) and domain services.
- **`packages/features/user-tokens`** — new feature package (NOT a plugin app, since this is user-scoped not project-scoped). Contains `TokenListView`, `GenerateTokenDialog`, `RevealTokenView`, `RevokeConfirmDialog`, `TokenRow`, and primitives (`StatusChip`, `ScopePill`, `FilterPopover`). Storybook stories per state.
- **`apps/web/src/routes/user/tokens.tsx`** — TanStack Router file. Imports `TokenListView` + hooks from the feature package; wires TanStack Query + the HTTP repository.
- **`apps/web/src/components/account-menu`** (existing, path to be confirmed during implementation) — one added menu item linking to `/user/tokens`.
- **`packages/i18n`** — new `tokens` namespace JSON files.

**No shell plugin.** The `/user/*` route is not a project-scoped app; it doesn't register a plugin manifest. Contrast with `/prj/{slug}/environments` which does.

## 5. API contracts

### 5.1 Data shapes

All types live in `packages/domain/src/entities/` and `packages/domain/src/usecases/dto/`, exported from `@guepard/domain/entities` / `@guepard/domain/usecases`.

```ts
// packages/domain/src/entities/user-token-scope.ts
import { z } from 'zod';

export const UserTokenScopeSchema = z.enum(['read', 'write', 'admin']);
export type UserTokenScope = z.infer<typeof UserTokenScopeSchema>;
```

```ts
// packages/domain/src/entities/user-token-status.ts
// View-only — NOT a column in public.user_tokens. Derived at render time.
export type UserTokenStatus = 'active' | 'expired' | 'revoked';

export function deriveUserTokenStatus(token: {
  revoked: boolean;
  expires_at: number;
  nowUnix?: number;
}): UserTokenStatus {
  const now = token.nowUnix ?? Math.floor(Date.now() / 1000);
  if (token.revoked) return 'revoked';
  if (token.expires_at <= now) return 'expired';
  return 'active';
}
```

```ts
// packages/domain/src/entities/user-token.type.ts
import { z } from 'zod';
import { UserTokenScopeSchema } from './user-token-scope';

// Mirrors public.user_tokens exactly (see 41-platform-settings-and-tokens.sql).
// `revoked` column lacks NOT NULL in the DB; we normalise null → false on read.
export const UserTokenSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  token_name: z.string().min(1).max(255),
  scopes: z.array(UserTokenScopeSchema).min(1),
  expires_at: z.number().int().positive(),       // Unix epoch seconds (bigint in DB)
  revoked: z.boolean().nullable().transform(v => v ?? false),
  revoked_at: z.string().datetime().nullable(),
  created_at: z.string().datetime().nullable(),  // DB allows null but trigger fills it
  updated_at: z.string().datetime().nullable(),
  created_by: z.string().uuid().nullable(),
  updated_by: z.string().uuid().nullable(),
});
export type UserToken = z.infer<typeof UserTokenSchema>;
```

```ts
// packages/domain/src/usecases/dto/create-user-token.input.ts
import { z } from 'zod';
import { UserTokenScopeSchema } from '../../entities/user-token-scope';

const ONE_DAY_SECONDS = 86_400;
const ONE_YEAR_SECONDS = 365 * ONE_DAY_SECONDS;

export const CreateUserTokenInputSchema = z.object({
  token_name: z.string().min(1).max(255),
  scopes: z.array(UserTokenScopeSchema).min(1),
  expires_at: z.number().int().positive(),        // Unix epoch seconds
}).refine(
  ({ expires_at }) => {
    const now = Math.floor(Date.now() / 1000);
    return expires_at > now && expires_at - now <= ONE_YEAR_SECONDS;
  },
  { message: 'expires_at must be in the future and within 365 days', path: ['expires_at'] }
);
export type CreateUserTokenInput = z.infer<typeof CreateUserTokenInputSchema>;
```

```ts
// packages/domain/src/usecases/dto/create-user-token.output.ts
import { z } from 'zod';
import { UserTokenSchema } from '../../entities/user-token.type';

export const CreateUserTokenOutputSchema = z.object({
  row: UserTokenSchema,
  rawJwt: z.string().min(1),   // returned ONCE; never again
});
export type CreateUserTokenOutput = z.infer<typeof CreateUserTokenOutputSchema>;
```

```ts
// packages/domain/src/usecases/dto/revoke-user-token.output.ts
import { UserTokenSchema } from '../../entities/user-token.type';
export const RevokeUserTokenOutputSchema = UserTokenSchema;
export type RevokeUserTokenOutput = UserToken;
```

### 5.2 Endpoints

All endpoints require an authenticated Supabase session cookie. The Bearer-token middleware (§3.3 Flow C) does **not** apply to these routes.

| Method | Path | Auth | Request | Response | Status codes |
|---|---|---|---|---|---|
| POST | `/user-tokens` | Session cookie | `CreateUserTokenInputSchema` | `CreateUserTokenOutputSchema` | 201 / 400 / 401 |
| GET | `/user-tokens` | Session cookie | — | `UserToken[]` (ordered by `created_at desc`) | 200 / 401 |
| POST | `/user-tokens/:id/revoke` | Session cookie | empty body | `RevokeUserTokenOutputSchema` | 200 / 401 / 404 / 409 |

### 5.3 Rate limiting, pagination, caching

- **Rate limiting**: none in phase 1. Documented as a phase-3 follow-up.
- **Pagination**: none. Expected per-user token counts are in the dozens at most; full-list fetch + client-side filter is appropriate.
- **Caching**: TanStack Query default cache on `GET /user-tokens`. Create and revoke mutations invalidate the list query on success.

## 6. Data model

### 6.1 Schema

**No new migration in phase 1.** The table, RLS, triggers, and index are already landed in:

- `apps/web/supabase/schemas/41-platform-settings-and-tokens.sql` (table `public.user_tokens`, index `user_tokens_by_account_id`, triggers `set_user_tokens_timestamps` and `set_user_tokens_user_tracking`).
- `apps/web/supabase/schemas/42-platform-rls.sql` (four policies: `user_tokens_read`, `user_tokens_insert`, `user_tokens_update`, `user_tokens_delete` — all via `is_account_owner(account_id)`).

Phase-1 acceptance: confirm `packages/supabase/src/database.types.ts` includes `user_tokens` in the `Tables` mapping. If not, run `pnpm supabase:web:typegen` as a one-off; no schema change involved.

### 6.2 Config / payload contracts

**N/A in phase 1.** `scopes jsonb` is a typed array of `UserTokenScope`, not a dynamic config blob. No `validation_rules`-style payload to specify.

### 6.3 Secrets contract

The **raw JWT** is the only token material. It leaves the server exactly once, as the `rawJwt` field of the `POST /user-tokens` 201 response. After that:

- It is never stored anywhere on the server side.
- It is never returned by any other endpoint.
- It is never logged — `apps/server` logs must redact the `rawJwt` field of `CreateUserTokenOutput` if logging middleware touches response bodies.

**JWT shape** (unchanged from v1):

```
Header:  { alg: "HS256", typ: "JWT" }
Payload: {
  token_id: <uuid>,         // public.user_tokens.id
  sub:      <uuid>,         // account_id
  scopes:   ['read'|'write'|'admin', ...],
  exp:      <unix-seconds>, // same as user_tokens.expires_at
  aud:      "authenticated",
  role:     "authenticated"
}
```

Signed HS256 with shared `JWT_SECRET` (env, not in code, not in this spec). Compatible with v1 + existing `guepard-public-api` validator + existing `guepard-cli` consumer.

## 7. File-by-file work items

Grouped by hexagonal layer, top-down. This section feeds `/spec-to-stories`.

### 7.1 Domain (`packages/domain`)

- `src/entities/user-token-scope.ts` — Zod enum + type.
- `src/entities/user-token-status.ts` — derived status type + `deriveUserTokenStatus` function.
- `src/entities/user-token.type.ts` — `UserTokenSchema` + `UserToken` type + `UserTokenEntity` class (follows existing entity patterns — `@Expose()`, `plainToClass`).
- `src/repositories/user-token.port.ts` — `abstract class IUserTokenRepository extends RepositoryPort<UserToken, string>` with methods `findByAccountId(accountId): Promise<UserToken[]>`, `create(input: CreateUserTokenRow): Promise<UserToken>`, `revoke(id, accountId): Promise<UserToken | null>`.
- `src/services/user-token/create-user-token.usecase.ts` — validates input via `CreateUserTokenInputSchema`, persists row, signs JWT, returns `{ row, rawJwt }`. JWT signing delegated to a `IJwtSigner` port so the service stays pure (see §7.2 adapter note).
- `src/services/user-token/revoke-user-token.usecase.ts` — calls repo.revoke, maps null return to domain exception.
- `src/services/user-token/list-user-tokens.usecase.ts` — calls repo.findByAccountId.
- `src/usecases/dto/create-user-token.input.ts` — exported above.
- `src/usecases/dto/create-user-token.output.ts` — exported above.
- `src/usecases/dto/revoke-user-token.output.ts` — exported above.
- `src/exceptions/user-token-*.exception.ts` — `TokenNotFoundException`, `TokenAlreadyRevokedException`, `TokenExpirationInvalidException`.
- `src/repositories/jwt-signer.port.ts` — `abstract class IJwtSigner` with `sign(payload: JwtPayload, options: { secret: string; algorithm: 'HS256' }): string`. Keeps `jsonwebtoken` out of the domain.
- Re-exports in `src/repositories/index.ts`, `src/services/index.ts`, `src/entities/index.ts`.

### 7.2 Adapters (`packages/repositories/*` and `apps/web/src/lib/repositories`)

- `packages/repositories/supabase/src/user-token.repository.ts` — `SupabaseUserTokenRepository` implementing `IUserTokenRepository`. Snake ↔ snake (column names already match the entity shape); no renaming.
- `packages/repositories/supabase/src/jwt-signer.ts` — concrete `JwtSigner` wrapping `jsonwebtoken.sign`. Lives in the Supabase adapters package because the server process uses it alongside Supabase.
- `apps/web/src/lib/repositories/user-token.repository.ts` — `HttpUserTokenRepository` implementing `IUserTokenRepository` via the v3 server API (`apiPost`, `apiGet`). No JWT signing on the client side.
- `packages/domain/src/repositories/repositories.ts` — extend the `Repositories` abstract surface with `userToken: IUserTokenRepository` and `jwtSigner: IJwtSigner`.
- `apps/web/src/lib/repositories-factory.ts` — instantiate `HttpUserTokenRepository`; `jwtSigner` is not provided on the browser side (only the server uses it).
- `apps/server/src/lib/repositories.ts` — instantiate `SupabaseUserTokenRepository` + `JwtSigner`.

### 7.3 Shell runtime (`packages/shell-runtime`)

**N/A in phase 1.** Token management is not project-scoped; it does not appear on `useShell()`. The web app consumes the `HttpUserTokenRepository` directly via the existing workspace context.

### 7.4 Server (`apps/server`)

- `src/routes/user-tokens.ts` — new route factory exporting three handlers:
  - `POST /user-tokens` — `zValidator('json', CreateUserTokenInputSchema)`, instantiate `CreateUserTokenService(repos.userToken, repos.jwtSigner)`, call `.execute({ ...input, accountId: ctx.accountId })`, return 201 with `CreateUserTokenOutputSchema`. Wraps errors via `handleDomainException`.
  - `GET /user-tokens` — list via `ListUserTokensService`; returns 200 with `UserToken[]`.
  - `POST /user-tokens/:id/revoke` — revoke via `RevokeUserTokenService`; returns 200 or 404/409.
- `src/server.ts` — register the new route factory under path prefix `/user-tokens`.
- `src/lib/auth.ts` (or equivalent — existing helper to extract the current user/account from the Hono context). The handlers use it to obtain `accountId` for the caller. No new helper is created; reuses whatever the other routes already use (`conversations`, `notebooks`, etc.).
- **Response-body logging redaction**: add `rawJwt` to the existing server-side log redaction list so the JWT never ends up in logs. If no such list exists today, file a follow-up (not a blocker for phase 1).
- **Bearer-token middleware module (shared)**: `packages/auth-shared/src/bearer-token-middleware.ts` (new thin package) exports `verifyBearerToken(authHeader, jwtSecret, dbClient): Promise<{ accountId, scopes } | null>` and `scopePermitsMethod(scopes, method): boolean`. The v3 server imports these but does **not** apply them to `/user-tokens/*` routes. The package exists so `guepard-public-api` can depend on it once cross-repo coordination happens.

### 7.5 Presentation — feature package (`packages/features/user-tokens`)

New package. Mirror the layout of `packages/features/datasources` or similar. **Component-split discipline (AM-1)**: token sub-flows ship as **content-only** components (renderable inline in the settings pane); no `Dialog`-wrapper variants in phase 1.

- `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`.
- `src/components/tokens-settings-pane.tsx` + stories + tests — the **top-level pane** that holds the `useReducer` pane-state machine and swaps between `"list"`, `"create"`, `"reveal"`, `"revoke-confirm"`. Used as the right outlet of the Settings dialog. Stories cover each of the four pane states.
- `src/components/token-list-view.tsx` + stories + tests — the **list state** of the pane (header, toolbar, table, empty / loading / error). Rendered by `TokensSettingsPane` when pane-state is `"list"`. Does NOT render as a page.
- `src/components/generate-token-form.tsx` + stories + tests — the **create state** of the pane (form + live preview, back button, Cancel + Create Token footer). Content-only. **No `Dialog` wrapper.**
- `src/components/reveal-token-view.tsx` + stories + tests — the **reveal state** (raw JWT + curl snippet + Close). Content-only. **No `Dialog` wrapper.**
- `src/components/revoke-confirm-inline.tsx` + stories + tests — the **revoke-confirm state**, rendered as an inline-modal block inside the pane (uses `role="alertdialog"` for a11y; not a Radix `Dialog`).
- `src/components/token-row.tsx` + stories.
- `src/components/primitives/status-chip.tsx` + stories — 3 variants (active / expired / revoked).
- `src/components/primitives/scope-pill.tsx` + stories — 3 variants (read / write / admin) with colour coding.
- `src/components/primitives/filter-popover.tsx` + stories — generic multi-select popover used for both filters.
- `src/hooks/use-user-tokens.ts` — TanStack Query wrappers: `useUserTokensQuery`, `useCreateUserTokenMutation`, `useRevokeUserTokenMutation`.
- `src/fixtures/user-tokens.fixture.ts` — test/Storybook fixtures (3 tokens: active, expired, revoked, each with a different scope combo).

### 7.6 Settings-shell package (`packages/features/settings-shell`)

**New, introduced by AM-1.** Thin generic package for the Settings dialog shell — kept separate from `@guepard/user-tokens` so future settings sections (profile, notifications, …) can be added without coupling to tokens.

- `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`.
- `src/components/settings-dialog.tsx` + stories + tests — the `<SettingsDialog>` component. Props per §3.2.1 (`open`, `onOpenChange`, `initialSection?`). Renders a Radix `Dialog` with the two-pane shell.
- `src/components/settings-sidebar.tsx` + stories — the left-nav list component. Takes a `sections: SettingsSection[]` array and an `activeSectionKey`. Each section is `{ key: string; label: string; icon?: IconComponent; content: ReactNode }`.
- `src/types/settings-section.ts` — `SettingsSection` and `SettingsSectionKey` types.
- `src/index.ts` — public exports.
- **Does not depend on `@guepard/user-tokens`.** The consumer (`apps/web`) imports both packages and composes them: `<SettingsDialog sections={[{ key: 'personal-tokens', label: t('settings.nav.personalTokens'), content: <TokensSettingsPane /> }]} />`.

### 7.7 Shell app

**N/A.** No `packages/apps/tokens` exists or is created. Settings is a dialog opened from the account menu; no routes in phase 1.

### 7.8 i18n (`packages/i18n`)

- `src/locales/en/tokens.json` — English values for every `tokens.*` key in §11.
- `src/locales/en/settings.json` — new namespace for the settings dialog shell (`settings.dialog.*`, `settings.nav.*`, `settings.menu.*`).
- `src/locales/{fr,es,de,...}/tokens.json` and `settings.json` — same key structure in every locale, English-identical placeholder values.

### 7.9 Host app (`apps/web`)

**Removed (was in the pre-amendment spec)**:
- ~~`src/routes/user/tokens.tsx`~~ — deleted by task 003 on Story 001.
- ~~`src/routes/user/route.tsx`~~ — never created.
- ~~`createUserTokensPath()` in `paths.config.ts`~~ — removed by task 003.

**Added**:
- `src/components/settings-dialog-mount.tsx` — a thin host-app component that owns the `open` boolean state for the Settings dialog and exposes an imperative opener via context. Rendered once near the app root (e.g. in `__root.tsx` or the organizations layout and the project-shell host — wherever it needs to be reachable). Composes `<SettingsDialog>` from `@guepard/settings-shell` with `<TokensSettingsPane>` from `@guepard/user-tokens`.
- `src/components/account-menu/*` (existing — exact path confirmed during implementation) — rename the existing unused gear-icon `onSettingsClick` prop to `onProfileSettingsIconClick` **in `@guepard/ui`**, then add a new "Settings" nav-item button with its own `onSettingsClick` handler that calls the settings-dialog-mount opener.
- `src/config/paths.config.ts` — **no new helpers in phase 1**. Any future `/user/settings/*` routes would add `createUserSettingsPath` helpers; phase 1 does not.
- `package.json` — add `@guepard/user-tokens` AND `@guepard/settings-shell` as workspace deps.

### 7.10 Cross-repo coordination (NOT in this repo, tracked here)

- **`guepard-public-api`** — update query from `guepard.gp_user_tokens` to `public.user_tokens` (schema prefix only; column names unchanged). Optionally adopt the `packages/auth-shared/src/bearer-token-middleware.ts` module delivered by this spec — if it is published as a standalone package or vendored across.
- **`guepard-cli`** — no change. Existing JWT-paste flow continues to work against v3-issued tokens because the JWT shape is unchanged.

## 8. Permissions and RLS

- **No new permission** in `app_permissions` enum.
- **No new RLS policy.** The four existing policies in `42-platform-rls.sql` (`user_tokens_read`, `user_tokens_insert`, `user_tokens_update`, `user_tokens_delete`) all call `is_account_owner(account_id)` from `07-accounts.sql`.
- Phase 1 **does not exercise** the `user_tokens_delete` policy — revoke is an UPDATE, not a DELETE. The policy exists for future phases.
- The Supabase client used by `apps/server` passes the session JWT so Postgres enforces RLS at the row level. Even if a server handler accidentally passed the wrong `account_id`, the RLS would reject the operation.

## 9. Security checklist

- [ ] Raw JWT is returned exactly once (`POST /user-tokens` response, `rawJwt` field) and never again.
- [ ] Raw JWT is never persisted. The DB stores only metadata.
- [ ] Listing endpoint response schema does not include `rawJwt`.
- [ ] `rawJwt` is added to the server-side log redaction list (or a follow-up is filed if no such list exists).
- [ ] Bearer-token middleware module verifies HS256 with `JWT_SECRET` before touching the DB.
- [ ] Revocation check in the middleware is a DB lookup, not a cache (a revoked token must stop working within the same request lifecycle).
- [ ] Scope enforcement is method-based and rejects with 403, not 401 (the user is authenticated but lacks scope).
- [ ] RLS enforces `is_account_owner(account_id)` — even a buggy handler can't read or write another user's rows.
- [ ] Server-side expiration cap (`365 days`) rejects at `POST /user-tokens`; client-side date picker `max` mirrors it.
- [ ] Expiration lower-bound (`> now`) rejects on both client and server.
- [ ] Curl example in the reveal view substitutes the real JWT (not a placeholder) so users don't paste invalid commands; the dialog still warns them the JWT is secret.
- [ ] No hardcoded `JWT_SECRET`, no check-in of a test secret in the spec / stories / tests. The spec references the env var by name only.
- [ ] No CORS change needed for `/user-tokens/*` (session-gated, same-origin).

## 10. Verification plan

### 10.1 Static checks

- `pnpm typecheck` — passes across `packages/domain`, `packages/repositories/supabase`, `packages/features/user-tokens`, `packages/features/settings-shell`, `apps/server`, `apps/web`.
- `pnpm lint` — no new violations. ESLint rule forbidding `react-i18next/Trans` direct import continues to pass.
- `pnpm format:fix` — no diff after running.

### 10.2 Unit tests

- **Domain**:
  - `CreateUserTokenInputSchema` — rejects empty name, invalid scopes, expiration in the past, expiration beyond 365 days. Accepts valid inputs.
  - `CreateUserTokenService.execute` — delegates to repo, signs JWT with correct claims (token_id = row.id, sub = accountId, scopes, exp).
  - `RevokeUserTokenService.execute` — repo.revoke returns null → throws `TokenNotFoundException`.
  - `deriveUserTokenStatus` — every combination of `revoked` + `expires_at` relative to `now`.
- **Repository adapter**:
  - `SupabaseUserTokenRepository.create` — mapped insert, RLS error handling.
  - `SupabaseUserTokenRepository.revoke` — update-with-returning, zero-rows case.
- **Feature package**:
  - `TokenListView` — renders each state (loading / empty / ready / error) correctly.
  - `GenerateTokenDialog` — submit disabled when invalid; submit calls mutation with correct payload; transitions to reveal view on success.
  - `RevealTokenView` — copy-button copies the raw JWT; copy-curl copies the substituted command.
  - `RevokeConfirmDialog` — confirm calls mutation; cancel does not.

Coverage target: ≥80% lines on `packages/features/user-tokens/src/` and `packages/domain/src/services/user-token/`.

### 10.3 Integration tests

- Route-level tests in `apps/server/__tests__/user-tokens.test.ts` using the existing mock-repository helper:
  - POST creates a row, returns `rawJwt`.
  - GET returns rows for the signed-in account only.
  - POST revoke flips `revoked = true`, `revoked_at`.
  - All three return 401 when no session.
  - Revoke returns 404 for unknown id, 409 for already-revoked id.

### 10.4 End-to-end (Playwright)

One spec at `apps/e2e/tests/user-tokens/create-reveal-revoke.spec.ts`:

1. Sign in as a fixture user.
2. Open the account dropdown → click **Settings** → the `<SettingsDialog>` opens with "Personal tokens" pre-selected on the left rail.
3. The `<TokensSettingsPane>` is in its `list` state — empty-state block (or table with 0 rows) visible.
4. Click Generate Token (the empty-state CTA, or the toolbar button if rows already exist). Pane transitions to `create`.
5. Fill name = "Playwright"; check Read + Write; keep the default 90-day expiration.
6. Click Create Token.
7. Pane transitions to `reveal`; the readonly JWT `<input>` is non-empty.
8. Click the Copy button on the JWT field; assert `navigator.clipboard.writeText` was called with the raw JWT (use `page.addInitScript` to install a spy).
9. Click Close. Pane transitions back to `list`; the dialog stays open.
10. Table now shows one row named "Playwright", Status = Active, Scopes pills = Read + Write.
11. Click the revoke icon on the row. Pane transitions to `revoke-confirm` — inline block inside the same dialog (no stacked Radix `Dialog`).
12. Click the Revoke button in the confirm.
13. Pane transitions back to `list`; the row now shows Status = Revoked; Revoked At is a timestamp within the last minute.

### 10.5 Manual smoke

Walk against `pnpm web:dev`:

1. `pnpm supabase:web:reset && pnpm supabase:web:typegen`. Confirm `Tables<'user_tokens'>` is generated. (This is a confirmation step; no new schema lands.)
2. `pnpm typecheck`, `pnpm lint`, `pnpm test`.
3. `pnpm web:dev`. Sign in. Open account dropdown → **Settings**.
4. `<SettingsDialog>` opens. Left nav shows "Personal tokens" (selected). Right pane renders `<TokensSettingsPane>` in `"list"` state; empty state visible.
5. Click Generate Token in the pane toolbar. Pane flips to `"create"` — still inside the same dialog, no new dialog opens.
6. Fill the form (Read + Write + Admin, 30-day expiration). Click Create Token. Pane flips to `"reveal"`; copy JWT; click Close. Pane flips back to `"list"`.
7. Verify the new row shows in the table with correct status and scopes.
8. Paste the copied curl command against a running `guepard-public-api` dev instance (if running locally), confirm 200 / 403 / etc. per scope.
9. Click the revoke icon on the row. Pane flips to `"revoke-confirm"` — inline block, no second dialog. Click Revoke. Pane flips back to `"list"`; the row shows Revoked status.
10. Try to use the revoked token via curl — expect 401.
11. Close the Settings dialog (X / Escape / overlay). Verify focus returns to the account-menu "Settings" button.
12. Open the Storybook build and visually compare each pane-state story against the mockups in `docs/rfcs/0009-token-management/`.

## 11. i18n key map

Two namespaces in phase 1: `settings.*` (for the settings-dialog shell) and `tokens.*` (for the tokens pane). JSON files at `packages/i18n/src/locales/{locale}/settings.json` and `packages/i18n/src/locales/{locale}/tokens.json`.

### Settings-shell namespace (`settings.*`)

**Account-menu entry**:
- `settings.menu.label` — "Settings"

**Dialog shell**:
- `settings.dialog.title` — "Settings"
- `settings.dialog.close` — aria-label for the X button
- `settings.dialog.discardGuard` — body of the `confirm()` guard when closing mid-edit

**Nav sections** (one key per section; phase 1 has one):
- `settings.nav.personalTokens` — "Personal tokens"

### Tokens namespace (`tokens.*`)

Per AM-1, dialog-shaped keys are reshaped for inline panes. `tokens.dialog.*` → `tokens.pane.*`. The old dialog keys listed below are **removed**; equivalent pane keys replace them.

**Pane header** (no longer "menu"):
- `tokens.page.title`
- `tokens.page.subtitle`

**Toolbar**:
- `tokens.toolbar.searchPlaceholder`
- `tokens.toolbar.status`
- `tokens.toolbar.scopes`
- `tokens.toolbar.generate`

**Table**:
- `tokens.table.name`
- `tokens.table.expires`
- `tokens.table.status`
- `tokens.table.createdAt`
- `tokens.table.revokedAt`
- `tokens.table.scopes`
- `tokens.table.actions`
- `tokens.table.notApplicable`
- `tokens.table.revokeAriaLabel`

**Status**:
- `tokens.status.active`
- `tokens.status.expired`
- `tokens.status.revoked`

**Scopes**:
- `tokens.scopes.read`
- `tokens.scopes.write`
- `tokens.scopes.admin`
- `tokens.scopes.readHelp`
- `tokens.scopes.writeHelp`
- `tokens.scopes.adminHelp`

**Create pane**:
- `tokens.pane.create.title`
- `tokens.pane.create.subtitle`
- `tokens.pane.create.back` — back button aria-label
- `tokens.pane.create.nameLabel`
- `tokens.pane.create.namePlaceholder`
- `tokens.pane.create.scopesLabel`
- `tokens.pane.create.expiresLabel`
- `tokens.pane.create.preview.title`
- `tokens.pane.create.preview.notSet`
- `tokens.pane.create.cancel`
- `tokens.pane.create.submit`

**Reveal pane**:
- `tokens.pane.reveal.heading`
- `tokens.pane.reveal.warning`
- `tokens.pane.reveal.jwtLabel`
- `tokens.pane.reveal.curlLabel`
- `tokens.pane.reveal.copyJwt`
- `tokens.pane.reveal.copyCurl`
- `tokens.pane.reveal.copied`
- `tokens.pane.reveal.close`

**Revoke-confirm pane (inline-modal)**:
- `tokens.pane.revoke.heading`
- `tokens.pane.revoke.body`
- `tokens.pane.revoke.cancel`
- `tokens.pane.revoke.confirm`
- `tokens.pane.revoke.toastSuccess`

**Empty state**:
- `tokens.empty.heading`
- `tokens.empty.body`
- `tokens.empty.action`

**Errors**:
- `tokens.errors.listHeading`
- `tokens.errors.retry`
- `tokens.errors.generic`
- `tokens.errors.invalidName`
- `tokens.errors.invalidScopes`
- `tokens.errors.expirationTooFar`
- `tokens.errors.expirationInPast`
- `tokens.errors.notFound`
- `tokens.errors.alreadyRevoked`

## 12. Implementation sequencing

5 stages. Per AM-1, Stage A adds a separate settings-shell package, and the host-app wiring in Stage A builds a settings-dialog mount point instead of a route.

**Stage A — types and UI scaffolding**

- Domain: entity + port + Zod schemas + DTOs.
- `@guepard/user-tokens` feature package scaffolded (empty `src/`, `package.json`, Vitest config).
- `@guepard/settings-shell` package scaffolded (empty `src/`, `package.json`, Vitest config).
- `tokens.*` and `settings.*` i18n namespace JSON files in every locale.
- Host-app account-menu entry "Settings" added (opens a stub Settings dialog via the mount component). No `/user/tokens` route.
- Account-menu item added (links to `/user/tokens`; route renders the placeholder for now).

**Stage B — data and domain**

- Domain services: `CreateUserTokenService`, `RevokeUserTokenService`, `ListUserTokensService`.
- `IUserTokenRepository` port + `IJwtSigner` port.
- `SupabaseUserTokenRepository` + `JwtSigner` adapter.
- Wire into `apps/server/src/lib/repositories.ts`.
- Domain-level unit tests.

**Stage C — server**

- `apps/server/src/routes/user-tokens.ts` with 3 handlers.
- Register in `apps/server/src/server.ts`.
- Route-level integration tests.
- **Parallel work item**: publish the shared `packages/auth-shared/src/bearer-token-middleware.ts` module (intended for `guepard-public-api` adoption in a separate ticket).

**Stage D — web wiring**

- `HttpUserTokenRepository` + wire into `apps/web/src/lib/repositories-factory.ts`.
- TanStack Query hooks in `packages/features/user-tokens/src/hooks`.
- **Settings-shell components** (`<SettingsDialog>`, `<SettingsSidebar>`) in `@guepard/settings-shell` + Storybook stories.
- **Tokens-pane components** (`<TokensSettingsPane>`, `<TokenListView>` inline, `<GenerateTokenForm>`, `<RevealTokenView>`, `<RevokeConfirmInline>`, `<TokenRow>`, primitives) in `@guepard/user-tokens` + Storybook stories.
- `<SettingsDialogMount>` in the host app composes the shell + the tokens pane via props.
- Replace the account-menu "Settings" stub (from Story 001 task 003) with the real opener via context.
- Unit tests for every component, including the pane-state `useReducer`.

**Stage E — polish and verification**

- Empty / loading / error state refinement across all pane states.
- Accessibility audit: tab order through the left nav and the right pane; Escape closes the Settings dialog (with `confirm()` guard if the pane is in create state); focus management on pane-state transitions; `role="alertdialog"` on the `<RevokeConfirmInline>` block; copy buttons keyboard-activatable.
- Vitest coverage ≥ 80 % on both feature packages + domain services.
- Playwright smoke spec `apps/e2e/tests/user-tokens/settings-dialog-create-reveal-revoke.spec.ts` (renamed from the pre-amendment path).
- Manual smoke walk per §10.5.
- `pnpm check` green from a clean working tree.
- File the `guepard-public-api` coordination ticket (cross-repo, not in this repo's PR).
- File the `ALTER COLUMN revoked SET NOT NULL` follow-up (tracked in RFC §10 phase-2 row).

## 13. Follow-ups (deferred, not in this phase)

Inherited from RFC §3.2 Non-goals plus items surfaced during spec drafting.

- **Org-owned / project-owned service tokens.** New `public.org_tokens` table, UI on org settings. **RFC 0009 phase 2.**
- **Resource-level scopes** (e.g. `notebooks:read`, `datasources:manage`). **RFC 0009 phase 3.**
- **Opaque prefixed tokens** (`grp_pat_xxx`). **RFC 0009 phase 4.**
- **Token rotation** (atomic issue-new + revoke-old). **RFC 0009 phase 2.**
- **Token usage metrics** (`last_used_at`, per-token request counters, audit log). **RFC 0009 phase 3.**
- **CLI-side browser pairing flow for PATs.** **Future RFC.**
- **Token sharing between users.** **Permanently out of scope.**
- **Webhook / integration-callback signing tokens.** **Separate future RFC.**
- **Audit log for token-management actions.** **Depends on platform-wide audit log primitive.**
- **`public.user_tokens.revoked` hardened with `NOT NULL`.** **RFC 0009 phase 2** (or a schema-polish phase, whichever lands first).
- **Rate limiting on public-API endpoints.** **RFC 0009 phase 3** or a broader platform concern.
- **Server-side log redaction list entry for `rawJwt`** — if a centralized redaction list doesn't exist yet, file a broader platform ticket.
- **Account-menu-link UX polish** — icon, keyboard shortcut, etc. Not blocking.

---

## Changelog

One line per deviation from this spec discovered during implementation. Populated by `/finish-story` when the "did the spec stay accurate?" check answers no.

- 2026-04-14 — RFC 0009 AM-1 — settings-dialog entry point. The spec's §1 Q3, §3.1 IA, §3.2 screen-by-screen, §3.3 user flows, §7.5 feature package, §7.6 (new) settings-shell package, §7.8 i18n, §7.9 host app, §10.1 static checks, §10.4 Playwright smoke filename, §10.5 manual smoke, §11 i18n key map (new `settings.*` namespace; `tokens.dialog.*` renamed to `tokens.pane.*`), and §12 Stage A/D were all updated to reflect the dialog + inline-pane-state architecture. Story 001 gains task 003 (undo the direct-route wiring). A new story between 009 and 010 ("build settings dialog shell") is added. Stories 010 and 011 are rescoped.
- 2026-04-15 — Story 002 — three cosmetic deviations from §7.1 domain file layout, chosen to match existing repo conventions. (a) The three DTOs (`CreateUserTokenInputSchema`, `CreateUserTokenOutputSchema`, `RevokeUserTokenOutputSchema`) shipped in a single file `src/usecases/dto/user-token-usecase-dto.ts` (matching `<entity>-usecase-dto.ts` pattern — see `datasource-usecase-dto.ts`, `notebook-usecase-dto.ts`) rather than three separate files. (b) Exception filenames are `token-not-found.exception.ts` / `token-already-revoked.exception.ts` / `token-expiration-invalid.exception.ts` — without the `user-token-` prefix §7.1 prescribed. (c) Exception API shape is factory functions (`tokenNotFoundException(tokenId)`, `tokenAlreadyRevokedException(tokenId)`, `tokenExpirationInvalidException(reason, expiresAt)`) returning `DomainException.new(...)` rather than class-style names — matching how `DomainException.new({ code: Code.X })` is actually called throughout the existing services. Functional contract identical; types, schemas, codes (3000–3002) all match §5.1 + §7.1 exactly. No downstream impact on Stories 004 / 005 / 006 / 008.
- 2026-04-15 — Story 003 — four deviations from §7.8 / §11 i18n location + scope. (a) Locale JSON files live at `apps/web/src/lib/i18n/locales/{locale}/{namespace}.json` (actual repo convention — see `datasources.json`, `integrations.json` etc.), not at `packages/i18n/src/locales/` as §7.8 prescribed. (b) Spec §11 included a spurious `tokens.events.*` section copied from RFC 0003's environments spec; dropped because token management has no lifecycle-event concept. (c) TODO(story-003) markers in `@guepard/ui` menu components were resolved by removing the comments and keeping the "Settings" literal — matching the surrounding "Home Page" / "Help" / "Log Out" literals, which are the existing `@guepard/ui` convention — rather than hoisting to a t()-called prop. (d) "Non-English locale files" criterion from the original story is N/A because the repo only has `en/` today; when a non-English locale lands, any later story in phase 1 (or a follow-up RFC) is responsible for mirroring the `settings.*` + `tokens.*` key structure. Functional contract (every spec §11 key shipped with real English copy; both namespaces registered) is exactly what the spec asked for.
- 2026-04-16 — Story 005 — one adapter-level deviation from §7.2. Spec described `JwtSigner` taking the secret in its constructor (`new JwtSigner(JWT_SECRET)`); actual implementation is stateless and the secret travels via `JwtSignerOptions.secret` on every `sign(...)` call (matching the `IJwtSigner` port shape from Story 002). The route layer (Story 006) calls `getJwtSecret()` once per request and passes it into `new CreateUserTokenService(repo, signer, secret)`. Functional contract identical; the bind point shifts one layer up, removing a duplicate source of truth for the secret.
- 2026-04-16 — Story 006 — three route-level deviations from §5.2 / §3.4 / §7.4. (a) Routes mount at `/api/user-tokens`, `/api/user-tokens` (POST), `/api/user-tokens/:id/revoke` rather than the spec's root-relative paths — matches the existing v3 server convention (every other route already lives under `/api/*`). (b) Phase-1 does NOT differentiate "already revoked" from "not found": both return 404 with `code = USER_TOKEN_NOT_FOUND_ERROR` (3000). The spec's 409-for-already-revoked branch is intentionally deferred — the repo's revoke-narrowed-by-`revoked = false` returns null in both cases, and adding a second findById round-trip just to refine the status code is not worth phase-1 complexity. The `USER_TOKEN_ALREADY_REVOKED_ERROR` (3001) code stays declared in `Code` for a later story to use. (c) Auth: instead of a centralised "current user" Hono middleware (which doesn't exist on apps/server today), Story 006 ships a one-off `apps/server/src/lib/current-account.ts` helper. Tests inject a stub via the new `CreateAppOptions.getCurrentAccountId` field, prod uses the helper. A future auth RFC owns rolling out a single per-request user-resolution middleware. Two follow-ups recorded in the story's Questions section: (i) centralised current-user middleware, (ii) `rawJwt` + sensitive-field log redaction (Pino `redact:` not configured today on apps/server).
- 2026-04-16 — Story 008 — two structural deviations from §7.2 / §4.2 hook surface. (a) `HttpUserTokenRepository` exposes a non-port method `createAndIssueJwt(input): Promise<CreateUserTokenOutput>` returning `{ row, rawJwt }`. The domain port's `create(input): Promise<UserToken>` cannot carry `rawJwt` (signing is a server concern not represented in `IUserTokenRepository`). The base `create` is implemented for port-shape conformance and delegates to `createAndIssueJwt` while dropping `rawJwt`; the create-mutation hook uses `createAndIssueJwt` directly. (b) Hooks read dependencies via a new `UserTokensApiProvider`/`useUserTokensApi` context inside the feature package, not via `useShell()` as §7.2 implied. `useShell()` is project-scoped and user tokens are account-scoped — the bespoke context is the right shape. The host (apps/web) wraps with the provider once at app root in Story 010; tests pass a stub `UserTokensApi`. Functional contract identical: a hook still returns `{ data, isLoading, error }` / `{ mutateAsync, isPending, error }`, both mutations still invalidate `['user-tokens', 'list']` on success.
- 2026-04-16 — Story 010 — one wiring deviation from §3.2.1 / §7.9. Spec implied two opener call-site wirings (`UserProfileMenu` in `apps/web/src/routes/organizations.tsx` + `ShellUserProfileMenu` in `apps/web/src/shell/project-shell-host.tsx`). Reality: FOUR call sites exist, all needing the wiring — the two named plus `apps/web/src/routes/org/$slug.tsx` (org-detail layout via `RootLayout`) and `apps/web/src/routes/org/$slug/project/$projectSlug.tsx` (per-project layout with inline `<ShellUserProfileMenu>`). All four now call `useSettingsDialog().open()`. The miss surfaced during user visual validation on `/org/guepard`; fixed before story-finish. Future RFC should consider centralising user-menu rendering to a single component to avoid this drift.
- 2026-04-16 — Story 012 — §10.4 Playwright steps 2, 3, 9 amended in place. The spec's original wording predated RFC 0009 AM-1 and referenced a `/user/tokens` URL that never shipped. The post-AM-1 flow enters the token surface via the Settings dialog (account menu → Settings), and the "close" step stays inside the dialog's `list` pane-state rather than navigating away. Step count stays at 13; only the entry points and the close semantics change.
- 2026-04-16 — Story 012 — one production-affecting schema bug surfaced by the live e2e run and fixed in `packages/domain/src/entities/user-token.type.ts`. The entity schema used `z.string().datetime()` for `created_at` / `updated_at` / `revoked_at` — Zod v4's default `.datetime()` requires a trailing `Z`, but Supabase/Postgres emits ISO-8601 with a `+00:00` offset, so every round-trip through `UserTokenSchema.parse(...)` failed validation and `useCreateUserTokenMutation` rejected on success responses. Fix: `.datetime({ offset: true })` on all three fields. Unit-test fixtures used `Z`-terminated strings so this was invisible to the domain suite; the e2e run against a real Supabase caught it. No production impact since phase 1 hasn't shipped yet.
