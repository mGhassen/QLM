# RFC 0009 — Token management

| Field      | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| Status     | Draft                                                                |
| Author     | Hani Chalouati                                                       |
| Created    | 2026-04-14                                                           |
| Target     | Phase 1 — faithful port of v1 personal access tokens into v3         |
| Supersedes | —                                                                    |
| Related    | RFC 0001 (Integrations) — credential-handling prior art              |

## 1. Summary

Personal access tokens (PATs) are how a human user authenticates **non-interactively** against the Guepard public API — from the CLI (`guepard-cli`), from CI pipelines, from scripts, from any tool that can't complete an interactive browser sign-in. This RFC ports that capability from `guepard-console` v1 into `guepard-console-v3` faithfully: one token-management screen where a user lists, creates, and revokes their tokens; one server-side Bearer-token middleware path that verifies a presented token against a DB record; one UI dialog that reveals the raw token exactly once at creation time and then never again.

A token belongs to a single user (`auth.users` row) and carries whichever orgs and projects that user is already a member of — exactly like their interactive session, just without a cookie. It carries one of three method-based scopes (`read` → GET, `write` → POST/PUT/DELETE, `admin` → all), matching v1 and the vocabulary `guepard-public-api` already enforces. It is transmitted as a JWT (HS256, same shape as v1) carrying `token_id`, `sub`, `scopes`, `exp`, `aud`, `role` — so `guepard-public-api` and `guepard-cli` continue to work against v3 with no changes on their side.

PAT validation is a **separate auth path** from the Supabase session cookie. The console UI keeps using its session cookie for every interactive action; the public API adds a Bearer-token middleware that runs when a request carries `Authorization: Bearer <token>` and has no session cookie. The two never overlap. This keeps PAT issuance independent of the Supabase/Better-Auth question discussed around RFC 0003's lifetime — if the session layer is replaced later, PAT validation does not move with it.

Phase 1 ships the full v1 UX at v3 fidelity. The token list renders with the complete toolbar from the screenshots — search input, status filter, scopes filter, Generate Token button — plus a soft revoke action per row that flips `revoked = true` / `revoked_at = now()` without deleting the row (so the user keeps a local record of what they revoked and when). The creation dialog ships with name, scopes, expiration date, live preview, and a one-time raw-token reveal. Server endpoints live at `/user-tokens/*` on `apps/server`, session-gated, targeting only the signed-in user's rows. A new Bearer-token middleware on the public-API surface validates presented JWTs against the renamed table. Token expiration **defaults to 90 days** from creation time and is **hard-capped at 1 year** — server-side validation rejects any create request with an expiration past the cap. The page lives at `/user/tokens`, establishing a new `/user/*` route area for "things about me" (tokens today; profile / sessions / API history in later RFCs). Organization-scoped tokens, service (machine-owned) tokens, resource-level scopes, token rotation without re-creation, and any CLI-side browser pairing flow are explicitly deferred to later phases.

Primitives and capabilities phase 1 delivers:

- A new token-management page at **`/user/tokens`** showing all of the signed-in user's tokens, establishing the `/user/*` route area.
- The table **`public.user_tokens`** (already landed in `apps/web/supabase/schemas/41-platform-settings-and-tokens.sql`; namespace adjusted from v1's `guepard.gp_user_tokens` — v3 uses `public.*`). Columns mirror v1 faithfully: `id` uuid, `account_id` (FK to `public.accounts` with `on delete cascade`; `public.accounts` is 1:1 with `auth.users`), `token_name varchar(255)`, `scopes` (JSONB array), `expires_at bigint` (Unix epoch seconds — same as the JWT `exp` claim, unchanged from v1), `revoked boolean default false`, `revoked_at timestamptz`, `created_at`, `updated_at`, `created_by`, `updated_by`. RLS already enabled in `42-platform-rls.sql` with four policies (`user_tokens_read`, `_insert`, `_update`, `_delete`) all gated by the existing `is_account_owner(account_id)` helper from `07-accounts.sql`. **Phase 1 ships zero schema work** — everything the RLS + table needs is already in the repo.
- **List toolbar matching the screenshot**: search-by-name input, status filter (active / expired / revoked), scopes filter (read / write / admin). Filters are client-side over the already-fetched list in phase 1 — no extra server query params.
- **Soft revoke**: sets `revoked = true`, `revoked_at = now()`. The row stays visible in the list with status `revoked` so the user has a local audit trail.
- **Expiration**: 90-day default in the create dialog's date picker, 1-year hard cap enforced server-side at `POST /user-tokens`. Requests with `expires_at - now() > 1 year` are rejected with a clear error.
- Three HTTP endpoints on `apps/server`: create, list, revoke. All require an authenticated session cookie.
- A JWT-Bearer middleware on the public-API side that verifies HS256, reads `token_id` from the claim, looks it up in `public.user_tokens`, rejects when `revoked = true` or `now > expires_at`.
- Scope enforcement middleware: `admin` allows any method, `read` allows GET only, `write` allows POST/PUT/DELETE only.
- i18n namespace covering every string in the list view + creation dialog + one-time reveal + empty states.
- RLS on the new table: a user reads and writes only their own rows.

## 2. Motivation

Guepard's story is that a user connects a source database once, clones it into a node, and then automates everything downstream — branch on every CI run, snapshot before a schema migration, hand a fresh branch to an AI agent, diff two branches from a dashboard. Every one of those downstream automations is **non-interactive**: it happens inside a CI pipeline, a `guepard-cli` invocation from a developer's terminal, an agent running in a container somewhere. None of those contexts can complete a browser-based sign-in. The only way they authenticate is by presenting a long-lived credential the user has explicitly issued — a personal access token.

The v1 console already had this. The table, the UI page, the create dialog, the JWT format, the public-API Bearer-token middleware, the CLI's use of the token in `Authorization: Bearer <jwt>` — all already exist in the adjacent repositories (`guepard-console`, `guepard-public-api`, `guepard-cli`). What is missing is **the v3 console's half of the feature** — because v3 is a fusion of `qwery-enterprise` and `guepard-console v1` and the fusion left the PAT screens on the v1 side. Shipping v3 without them would require every CLI user and every CI pipeline to keep a v1 console running just to issue tokens.

The second reason to ship this now — not later — is that it unblocks the **core platform stories** that depend on non-interactive access. RFC 0008 (Qwery Agent) needs some way for an agent process to authenticate against the public API; `guepard-cli` is already shipping and needs v3 to be the place users issue tokens; the future RFCs around integrations (RFC 0001 phase 3+) and environments (RFC 0004 when it lands) will also consume the public API from scripts and from node-side code. PATs are the shared foundation.

The third reason is that this is a **low-risk port**, not a redesign. The v1 implementation works. The `guepard-public-api` validator and the `guepard-cli` consumer already speak its JWT format, already use its scope vocabulary, already handle its revocation semantics. Phase 1 intentionally rebuilds that same surface in v3 with v3's idioms (Supabase schema, Hono routes on `apps/server`, TanStack Router page, `@guepard/ui` components, i18n, Zod validation) — no new concepts, no new vocabulary, no new behavior on the validator or CLI side. Any experiments on format (opaque prefixed tokens), on finer scopes (resource-level), or on ownership (org-owned service tokens) happen in later phases, on top of a working base.

A fourth, smaller motivation: the token screen is one of the few user-owned settings pages in v3. It slots naturally next to other account-level UX that v3 will eventually need (profile, API history, audit log) and establishes a pattern — `/user/*` routes for "things about me", as opposed to `/org/*` (things about an org) or `/prj/*` (things about a project) that are already in the router.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

Each bullet is an observable exit criterion. Phase 1 is done when every bullet is satisfied.

- **User-scoped token primitive (already landed in-schema).** Table `public.user_tokens` exists in `apps/web/supabase/schemas/41-platform-settings-and-tokens.sql` with columns `id` (uuid), `account_id` (uuid, FK → `public.accounts` with `on delete cascade`), `token_name` (varchar 255), `scopes` (jsonb array of `'read' | 'write' | 'admin'`), `expires_at` (bigint — Unix epoch seconds, identical to the JWT `exp` claim), `revoked` (boolean default false), `revoked_at` (timestamptz nullable), `created_at`, `updated_at`, `created_by`, `updated_by`. RLS is enabled in `42-platform-rls.sql` with four policies (`user_tokens_read`, `_insert`, `_update`, `_delete`) all using the `is_account_owner(account_id)` helper from `07-accounts.sql`. Phase 1 **writes no new migration** — it consumes this schema as-is.
- **Route `/user/tokens`.** The token-management page lives at `/user/tokens`, under a new project-agnostic `/user/*` route area. Sidebar entry point decided in the spec (probably the account menu, not the main sidebar).
- **List view matching the mockup.** One row per token: name, expires, status (`active` / `expired` / `revoked`, computed from `expires_at` + `revoked`), created_at, revoked_at (or N/A), scopes as pills, revoke action.
- **Full list toolbar.** Search-by-name input, status filter (active / expired / revoked), scopes filter (read / write / admin), Generate Token button. Filters are client-side over the already-fetched list.
- **Create dialog.** Required name field; `read` / `write` / `admin` scope checkboxes (at least one required); expiration date picker with **90-day default**; live preview panel on the right reflecting the current form state. Submit disabled until name is non-empty and at least one scope is checked.
- **One-time reveal.** On submit, the raw JWT is displayed once in the dialog with a copy button and an unmissable "you won't see this again" warning. Closing the dialog drops the raw JWT from memory. The listing endpoint never returns token material.
- **Soft revoke.** Revoke action sets `revoked = true`, `revoked_at = now()`. The row **stays visible** in the list in Revoked status. Token rejected by the public-API validator from that point forward. No hard delete in phase 1.
- **Expiration cap.** Server-side validation rejects `POST /user-tokens` when `expires_at - now() > 365 days`. Client-side the date picker's `max` attribute mirrors the cap.
- **Three HTTP endpoints on `apps/server`.** `POST /user-tokens`, `GET /user-tokens`, `POST /user-tokens/:id/revoke` (chosen over `DELETE` to make soft-revoke semantics explicit — the row is not deleted). All three require the current Supabase session and target only the signed-in user's tokens.
- **Bearer-token middleware on the public-API side.** Verifies JWT HS256 against the shared `JWT_SECRET`, extracts `token_id` from the claim, looks the row up in `public.user_tokens`, rejects when `revoked = true` or when `now > expires_at`.
- **Scope enforcement middleware.** Allows the request only if the token's `scopes` array permits the HTTP method — `admin` always, `read` on GET, `write` on POST/PUT/DELETE.
- **i18n namespace** covering every user-facing string — list view, toolbar, create dialog, one-time reveal, status chips, action buttons, toasts, empty state, error messages.
- **Compatibility with existing `guepard-public-api` and `guepard-cli`.** Tokens issued by v3 must validate in the existing public-API without any change to its validation logic, and must work when the existing CLI presents them as `Authorization: Bearer <jwt>`. Token shape, column names (`account_id`, `token_name`, `scopes`, `expires_at`, `revoked`, `revoked_at`), and `JWT_SECRET` all stay identical to v1's. The single coordination point with `guepard-public-api` is updating its query from `guepard.gp_user_tokens` to `public.user_tokens` — a schema-prefix change, not a structural one.

### 3.2 Non-goals (phase 1)

Each non-goal is pinned to a named future phase.

- **Organization-owned or project-owned tokens.** A token still belongs to a personal account in phase 1. Org-owned service tokens (no human bound, survive user offboarding, owned by an organization) are **phase 2**. They need a different data model (`organization_id` instead of `account_id`, most likely a sibling table `public.org_tokens`) and a different UI (org settings page instead of user settings).
- **Resource-level scopes.** `read` / `write` / `admin` stay method-based in phase 1. Scopes like `notebooks:read`, `datasources:manage`, `environments:write` require enumerating the resource surface, a new enforcement mechanism on the public API, and a redesign of the creation dialog. **Phase 3 (fine-grained scopes)**.
- **Opaque prefixed tokens.** Phase 1 keeps JWT HS256 for continuity with the v1 public-API validator and CLI. Migrating to `grp_pat_xxx`-style opaque tokens (sha256-hashed in the DB, stateless-free rotation, no decodable claims) is **phase 4 (token format migration)**.
- **Rotation.** Phase 1 has no "rotate this token" action. The user revokes the old one and creates a new one. **Phase 2** adds an atomic rotate button that issues a new token and revokes the old one in a single transaction.
- **Token usage metrics.** No "last used at", no "requests in the last 30 days", no per-token audit log in phase 1. Tokens carry creation + revocation metadata only. **Phase 3 (token observability)** adds usage tracking, which implies writes on the validator side per request.
- **Token secret in a vault.** The raw JWT is shown once and never persisted in any Guepard-owned storage (not even hashed in phase 1 — the DB stores only metadata, and verification is signature-based). Phase 4's opaque-token format introduces DB-side hashes; phase 1 does not.
- **CLI-side browser pairing flow for PATs.** The existing `guepard-cli` uses a browser-login flow that produces a session JWT; it does not paste PATs today. Wiring a `guepard login --with-pat` flow (or the reverse, a "device authorization" flow that provisions a PAT through the browser) is **phase 2 or later** — this RFC ships the UI-driven path only.
- **Token sharing between users.** A token is owned by one user and cannot be transferred. Sharing is an anti-pattern we actively reject — the replacement is org-owned service tokens (phase 2).
- **Webhook signing / callback tokens.** RFC 0001 integrations and future webhook work need their own token shape. **Separate future RFC**, not scheduled against this one.
- **Auditing of token-management actions.** No audit log for "token X created by user Y at time T", no email notification on creation / revocation. Future phase — depends on when the platform gains an audit-log primitive.

## 4. Prior art in the codebase and neighbouring repositories

This RFC is a **port**, not a greenfield design. Treat every item below as either reused or reimplemented-faithfully.

- **`guepard-console` v1 — reference UI**: the token management screen lives at `/app/home/(user)/access-tokens` with a `generate-token-dialog.tsx` component. The screenshots in `docs/rfcs/0009-token-management/` are authoritative visual reference — the v3 port matches them, modulo v3 design-system substitution.
- **v1 database schema**: `guepard.gp_user_tokens` (migration `20250415160118_create_gp_user_tokens.sql`). Columns: `id`, `account_id` (FK to `public.accounts`), `token_name`, `scopes` (JSONB array), `expires_at` (BIGINT Unix seconds), `revoked` (boolean default false), `revoked_at` (timestamp nullable), `created_at`. The v3 port is **more faithful than a typical rewrite**: v3 kept `public.accounts` (it's the 1:1 personal-account table referenced by `auth.users`, described in `04-initial-tables.sql` as *"personal accounts only, one per user"*), kept `account_id` as the FK column, kept `token_name`, kept `expires_at` as `bigint` (matching the JWT `exp` claim). The only change is the schema prefix: `guepard.gp_user_tokens` → `public.user_tokens`. That schema lives today in `41-platform-settings-and-tokens.sql` and its RLS in `42-platform-rls.sql` (both already merged).
- **`guepard-public-api` — validator**: the Hono / Lambda service that consumes tokens. Already implements the JWT HS256 verify, `token_id`-in-DB lookup, `revoked` / `expires_at` checks, and the method-based scope authorizer (`admin` = all, `read` = GET, `write` = POST/PUT/DELETE). Phase 1 **does not modify it** — the v3 console writes tokens in the same shape and the same table (renamed), so the validator keeps working with zero changes on its side beyond pointing at the renamed table / column.
- **`guepard-cli` — consumer**: sends `Authorization: Bearer <jwt>` on every request, stores the JWT in the OS keyring (or a 0600-mode file fallback). Today the CLI acquires that JWT through a browser-based login flow, not through a user-pasted PAT. Phase 1 does not change the CLI; it simply makes v3 the new place where a user can generate additional non-interactive tokens for CI or scripts that sit alongside that flow.
- **RFC 0001 (Integrations)** — prior art for credential handling. `ISecretVault` is used there to protect cloud-provider credentials. **Not reused** here — PATs are not secrets Guepard protects on behalf of a user; they are secrets the user holds. The raw JWT leaves the server exactly once (in the creation response) and is never re-read. Nothing about the token lands in the vault.
- **v3 schema and auth**: `apps/web/supabase/schemas/04-initial-tables.sql` for the existing user-adjacent shapes, `packages/supabase/src/*` for the session-cookie machinery. PAT validation is deliberately **separate** from that machinery (see §5.4).
- **Supabase Auth vs Better Auth**: the ongoing session-layer discussion is orthogonal. PATs use the same `JWT_SECRET` that v1 uses. If the session layer migrates off Supabase later, the PAT flow is not affected.

## 5. Conceptual model

### 5.1 What a token is

A **personal access token** is a JWT signed with `JWT_SECRET` (HS256) that carries a `token_id` claim pointing to a row in `public.user_tokens`. The token is opaque to the user who holds it (they treat it as a black-box string) but is self-describing to the verifier — the verifier can read `sub` (the user), `scopes`, `exp`, and `token_id` without a DB hit, and only touches the DB to check revocation.

A token has three **lifecycle states**, computed from the row, never stored directly:

- `active` — `revoked = false` AND `expires_at > now()`.
- `expired` — `revoked = false` AND `expires_at ≤ now()`.
- `revoked` — `revoked = true`.

A token has one of three **scopes** (array, at least one element, any combination of):

- `read` — permits HTTP `GET` on public-API routes.
- `write` — permits `POST`, `PUT`, `DELETE` on public-API routes.
- `admin` — permits any method on any route the holder would otherwise have access to.

Scopes are **permissive** (a token with `[read, write]` may do both) and **method-based** (they do not restrict which resources are touched — that is governed by what orgs/projects the token's user is a member of, checked exactly as it is for the interactive session).

### 5.2 Lifecycle of a token (user-facing)

1. **Create.** User opens the token-management page, clicks "Generate Token", fills in a name (required), picks at least one scope, picks an expiration date (defaults to "90 days from now" — exact default pinned in the spec), and confirms.
2. **Reveal.** The server signs the JWT, persists the row, and returns `{ token: <raw jwt>, row: <UserToken without the raw jwt> }`. The dialog shows the raw JWT with a copy button and a prominent "you won't see this again" warning. When the dialog closes, the raw JWT is unrecoverable.
3. **Use.** The user (or their CLI / CI / script) presents the token as `Authorization: Bearer <jwt>` against the public API. The public API verifies the signature, looks up the row by `token_id`, checks `revoked` and `expires_at`, enforces scope-vs-method, then proceeds as if the user were signed in through the browser (with the user's full org/project membership).
4. **Revoke.** The user returns to the token-management page, finds the row, clicks revoke. The row flips to `revoked = true`, `revoked_at = now()`. From that moment on the token fails validation.
5. **Expire.** Once `now > expires_at`, validation fails automatically. Expired rows remain visible in the list (greyed out, `status = expired`) so the user knows what expired and when.

### 5.3 Ownership

A token is owned by one `public.accounts` row, which itself is 1:1 with one `auth.users` row. Consequences:

- A user can create many tokens (no hard cap in phase 1; reasonable-cap policy decided in the spec).
- A user sees only their own tokens — enforced by the `user_tokens_read` RLS policy via `is_account_owner(account_id)`.
- When the `auth.users` row is deleted, the `public.accounts` row cascades, and the `public.user_tokens` rows cascade with it.
- When the user is removed from an organization, their tokens immediately stop working for that organization's resources (because the validator checks org membership live, at request time, using the token's `sub`).
- There is no team-owned, org-owned, project-owned, or machine-owned token in phase 1. Every token has a human on the other end.

### 5.4 Two auth paths, one server

```
               Browser (console UI)                     CLI / CI / script
                      │                                          │
                  session cookie                    Authorization: Bearer <jwt>
                      │                                          │
                      ▼                                          ▼
              Supabase session auth                      PAT Bearer auth
              (existing middleware)                  (new middleware this RFC)
                      │                                          │
                      └────────────────┬─────────────────────────┘
                                       │
                                       ▼
                          Authenticated request → RLS
                  (same user identity from either path)
```

The console uses the session cookie. The public API route group uses a Bearer middleware that runs when (a) `Authorization: Bearer <token>` is present **and** (b) no Supabase session cookie is present. The two paths never overlap in phase 1 — there is no endpoint that accepts both session and PAT, and no request that carries both.

### 5.5 What belongs where (not this RFC)

| Concern                                                      | Home                                |
| ------------------------------------------------------------ | ----------------------------------- |
| Issuing user-owned tokens + listing + revoking + validation  | **This RFC**                        |
| CLI browser-pairing flow                                     | `guepard-cli` (not changed here)    |
| Public-API JWT verify + method-based scope enforcement       | `guepard-public-api` (not changed here, only the table name is) |
| Interactive session cookies                                  | `packages/supabase/*` (unchanged)   |
| Org-owned service tokens                                     | Phase 2 of this RFC                 |
| Resource-level scopes                                        | Phase 3                             |
| Opaque prefixed token format (`grp_pat_xxx`)                 | Phase 4                             |
| Webhook / callback signing tokens                            | Separate future RFC                 |
| Audit log of token-management actions                        | Separate future RFC                 |

## 6. UX surface

### 6.1 Routing and shell placement

- **Primary route**: `/user/tokens`. Establishes a new `/user/*` area in the router for user-owned settings pages. Uses TanStack Router file-based routing, same convention as the rest of `apps/web/src/routes/`.
- **No project context**: `/user/*` routes are outside the `/prj/*` and `/org/*` hierarchies — token management is account-wide, not scoped to a specific project.
- **Sidebar entry point**: a link in the user account menu (top-right avatar dropdown, spec decides the exact location). Not a main-sidebar item, to keep the sidebar focused on project-scoped apps.

### 6.2 List view — matches `docs/rfcs/0009-token-management/token-list.png`

- **Header**: "Your Access Tokens List" + helper text "Here you can find all your Access Tokens. You can manage them or revoke a token."
- **Toolbar** (left-to-right): search input (filters by `name` as the user types), status filter popover (active / expired / revoked, multi-select), scopes filter popover (read / write / admin, multi-select), "Generate Token" primary button on the right.
- **Table columns** (in order): Name, Expires, Status, Created At, Revoked At, Scopes, Actions. Each column is sortable except Scopes and Actions.
- **Status pill**: colored chip — green for `active`, grey for `expired`, red for `revoked`.
- **Scopes pill**: one pill per scope, color-coded. Multiple pills stack inline.
- **Actions cell**: a revoke icon button (only present when `status = active`). Disabled for already-revoked and expired rows.
- **Empty state**: centered illustration + "No tokens yet" + "Generate your first token" primary action button.
- **Loading state**: 6 skeleton rows.
- **Error state**: inline error with retry.

### 6.3 Create dialog — matches `docs/rfcs/0009-token-management/generate-token.png`

- **Title**: "Create a New Token". Subtitle reserved for post-creation state ("Your new access token has been generated").
- **Two-column layout**: form on the left, live preview panel on the right.
- **Form fields** (left column):
  - **Token Name**: required text input, placeholder "Enter token name".
  - **Scopes**: three checkboxes — Read, Write, Admin. Each with a short helper description. At least one is required (submit disabled otherwise).
  - **Expiration Date**: date picker. Default = today + 90 days. `min` = today + 1 day. `max` = today + 365 days.
- **Preview panel** (right column): "Preview Token Settings" header, then live-updating rows for Token Name, Scopes, Expiration Date. Empty fields show "Not set" in muted text.
- **Footer**: Cancel button (secondary), Create Token button (primary, disabled until the form is valid).
- **Post-creation state**: the dialog flips to a reveal view showing the raw JWT in a monospace field with a copy button and a warning banner ("This token won't be shown again — copy it now"). Only affordance is a "Close" button that confirms the user has copied the token.

### 6.4 Revoke flow

- Revoke icon on a row opens a confirmation dialog ("Revoke this token? Any process using it will stop working.") with Cancel and Revoke buttons.
- Confirming fires `POST /user-tokens/:id/revoke`, flips the row's status chip to `revoked`, fills in the Revoked At column.
- No undo. Revocation is permanent. The row remains in the list for audit.

### 6.5 Empty, loading, error states

Every screen (list, create dialog, confirm dialog) has defined loading / error states with localized copy. Fully enumerated in the phase-1 spec.

## 7. Persistence model

The schema for `public.user_tokens` already exists in `apps/web/supabase/schemas/41-platform-settings-and-tokens.sql` and its RLS in `42-platform-rls.sql`. Phase 1 writes **no new migration** and adds **no new enum value**. The conceptual shape is what §3.1 and §4 describe; the authoritative column list is the SQL file itself. All RLS policies go through `is_account_owner(account_id)` (defined in `07-accounts.sql`), which verifies `auth.uid()` equals the `accounts.user_id` of the token's owning account row.

## 8. Server surface

_Phase-1 endpoints are listed in §3.1. The exact route paths, request/response DTOs, and error taxonomy are resolved in Round 2 and locked in the spec._

The critical contracts are:

- Creation: returns the **row + raw JWT**. The raw JWT is returned exactly once and never again.
- Listing: returns rows only (no JWT, no token material of any kind). Fields: `id`, `token_name`, `scopes`, `expires_at`, `revoked`, `revoked_at`, `created_at`, `updated_at`.
- Revocation: returns the updated row.
- Every endpoint requires the current user's session cookie. The Bearer middleware does **not** apply to `/user-tokens/*` — token management is console-only.

## 9. Security considerations

_To be expanded in Round 3. Anchor points:_

- **Raw JWT never leaves the DB-through-server-to-browser path.** It is the server's single response at creation time; the DB does not store it and the listing endpoint never returns it.
- **Signature-based verification, DB-based revocation.** The validator checks the JWT signature for tamper resistance and checks the DB row for revocation + expiry. Both gates must pass.
- **RLS on `public.user_tokens`.** Even a buggy server route can't leak another user's tokens — all four policies (`_read`, `_insert`, `_update`, `_delete`) call `is_account_owner(account_id)` which verifies `auth.uid()` equals the owning account's `user_id`.
- **No rate limiting in phase 1.** The existing public-API has no rate limiting either (audit confirmed). Token-creation and token-list endpoints are consoled-only and session-gated, so abuse surface is limited to a signed-in user spamming their own account. Future-phase rate limiting is a broader platform concern.
- **Expiry default and cap.** Default expiry is 90 days from creation. Server-side hard cap is 365 days — `POST /user-tokens` rejects any request with an expiration farther out. Never-expiring tokens are not possible in phase 1.
- **JWT_SECRET sharing.** Phase 1 uses the same `JWT_SECRET` as v1 and the existing public-API. That secret lives in deployment-side env config and is not part of this RFC's delivery.

## 10. Rollout plan

| Phase | Scope                                                                                                                                                                                                   | Artifacts              | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------ |
| 1     | User-owned PATs in v3. Table, list UI, create dialog + one-time reveal, revoke, session-gated server endpoints, Bearer middleware on public API, method-based scopes, JWT HS256 compatible with v1.      | This RFC + phase-1 spec | Draft  |
| 2     | **Org-owned service tokens + rotation.** New `public.org_tokens` table (sibling of `public.user_tokens`, `organization_id` FK), UI on org settings, atomic rotate action, permissions gating creation. Plus a follow-up to harden `public.user_tokens.revoked` with a `NOT NULL` constraint. | Phase 2 RFC            | Future |
| 3     | **Fine-grained scopes + token observability.** Resource-level scopes (`notebooks:read`, `datasources:manage`, …), last-used timestamps, per-token usage counters, an audit log of token-management events. | Phase 3 RFC            | Future |
| 4     | **Token format migration.** Opaque prefixed tokens (`grp_pat_xxx`), sha256 DB storage, backwards-compatible verifier during a deprecation window, CLI + public-API updates.                               | Phase 4 RFC            | Future |

## 11. Open questions

Questions closed in Rounds 1–2:

- **R1/Q1** Ownership: user-scoped, inherits the user's orgs.
- **R1/Q2** Scope model: keep v1's method-based `read` / `write` / `admin`.
- **R1/Q3** Token format: keep JWT HS256, same `JWT_SECRET` as v1.
- **R1/Q4** Auth coexistence: separate Bearer middleware for PATs; console routes keep using the session cookie.
- **R2/Q1** List toolbar breadth: full toolbar — search, status filter, scopes filter, Generate.
- **R2/Q2** Revocation semantics: soft revoke, row stays visible, no hard delete.
- **R2/Q3** Expiry: 90-day default, 365-day hard cap.
- **R2/Q4** Route location: `/user/tokens`, establishing a new `/user/*` area.

Resolved in Round 2 and confirmed by the existing schema in `41-platform-settings-and-tokens.sql` / `42-platform-rls.sql`:

- **Table name is `public.user_tokens`** — schema already landed.
- **Revocation is soft** — `revoked boolean` and `revoked_at timestamptz nullable` columns are present and the UPDATE RLS policy supports it.
- **`account_id` column stayed** (not renamed to `user_id`) — the schema kept v1's column name because v3 preserved `public.accounts`.
- **`expires_at` is `bigint` Unix seconds** — matches v1, matches the JWT `exp` claim, the schema has already committed to this.

Remaining questions for the spec:

1. **Revoke endpoint shape**: `POST /user-tokens/:id/revoke` (verb-as-path, clear that it's a soft revoke) vs `PATCH /user-tokens/:id` with a body (`{ revoked: true }`). Proposal: **`POST /user-tokens/:id/revoke`** — the explicit verb surfaces the soft-revoke semantics in the URL.
2. **Cross-repo coordination**: `guepard-public-api` today queries `guepard.gp_user_tokens`. It needs a one-line schema-reference update to `public.user_tokens` (column names `account_id`, `token_name`, `scopes`, `expires_at`, `revoked` are unchanged). Spec decides whether the two ship in one coordinated release or whether v3 runs in dev-only until that lands. Proposal: **coordinated release** — a single rename commit against `guepard-public-api` ships in lockstep with the phase-1 v3 release.
3. **Default sidebar entry point for `/user/tokens`**: account dropdown only, or also a link from the empty-state of any PAT-consuming surface (e.g. "create a CLI token" inside future CLI docs). Proposal: **account dropdown only in phase 1**.
4. **Token usage hint on creation**: should the post-creation reveal dialog include a one-liner snippet showing how to use the token (`curl -H "Authorization: Bearer <token>" ...`)? Small, useful, trivially localized. Proposal: **yes, one copyable example**.
5. **`revoked` NOT NULL**: the DB column has `default false` but no `NOT NULL` constraint. Services and Zod schemas should treat `revoked` as strictly boolean (never null) and either (a) default to `false` in code when reading back a row, or (b) add a later migration to harden the column with `NOT NULL`. Proposal: **(a) treat as non-null in code, (b) file a "harden" follow-up** for phase 2 or a schema-polish phase — don't block phase 1 on a schema amendment.

## 12. Alternatives considered

- **Redesign scopes to be resource-level from day one.** Rejected in Round 1. Breaks continuity with `guepard-public-api` and `guepard-cli`, multiplies the surface of this RFC, and the bulk of real users today only need the method-based split. Deferred to phase 3.
- **Opaque prefixed tokens (`grp_pat_xxx`) from day one.** Rejected in Round 1. Industry-cleaner, but costs a public-API rewrite (from JWT verify to sha256 DB lookup) and a CLI rotation — none of which this RFC is willing to take on. Deferred to phase 4.
- **Make PAT JWTs shape-compatible with Supabase session JWTs** so one middleware handles both. Rejected in Round 1. Ties PAT issuance to Supabase's JWT shape and complicates any future Better Auth migration. Separate middlewares keep the two concerns independent.
- **Org-owned tokens in phase 1** (no user bound, owned by an organization). Rejected in Round 1 on sequencing grounds. Needs a different data model (`organization_id` FK), different RLS, different UI location (org settings, not user settings), and different ownership semantics around offboarding. All real concerns — they deserve their own phase.
- **Accept PATs on any endpoint, including console routes.** Rejected in Round 1. Blurs the interactive / non-interactive boundary, forces console-only features (CSRF-free mutations, browser-only flows) to be PAT-aware, and is not asked for by any current caller. PATs stay bound to the public-API surface.
- **Reuse RFC 0001's `ISecretVault` to store token material.** Rejected. PATs are secrets the **user** owns, not secrets Guepard protects on their behalf. The raw JWT leaves the server once and is never re-read; there is nothing to vault.
- **Hard-delete on revoke.** Rejected in Round 2. Removes the audit affordance ("I revoked this token on Oct 9") that the screenshots specifically design for (dedicated Revoked At column). Makes post-incident investigations harder. Costs nothing to keep the row.
- **30-day default expiry with a 90-day cap.** Rejected in Round 2 on user-experience grounds. Aggressive rotation is security-positive but real-world CI users keep tokens in pipelines for months at a time; a 30-day cadence forces constant re-plumbing. 90/365 is the sweet spot.
- **1-year default with no hard cap.** Rejected in Round 2. Permanently-valid tokens are an anti-pattern — they outlive role changes, team offboarding, and stolen-laptop incidents. A 365-day ceiling is not onerous and keeps the upper bound predictable.
- **Drop the list-view filters for phase 1.** Rejected in Round 2. Both filters are client-side over the already-fetched list, so their cost is essentially UI-only, and losing the status filter specifically makes stale tokens (expired / revoked) visually noisy.
- **Nest token management under `/org/{slug}/members/{me}/tokens`**. Rejected in Round 2. Tokens are user-owned in phase 1 and visible only to their owner — nesting them under an org page would either duplicate rows across every org the user belongs to or mislead users into thinking the tokens were org-scoped. `/user/*` is the right home.

## 13. References

- `docs/rfcs/0009-token-management/token-list.png` — Layer 1 screenshot of the token management page from the v1 console.
- `docs/rfcs/0009-token-management/generate-token.png` — Create-token dialog screenshot from the v1 console.
- `../guepard-console` — v1 console, reference UI at `/app/home/(user)/access-tokens`, migration `20250415160118_create_gp_user_tokens.sql`.
- `../guepard-public-api` — public-API validator. JWT HS256 verify + `token_id`-in-DB lookup + method-based scope authorizer.
- `../guepard-cli` — consumer. `Authorization: Bearer <jwt>`, keyring storage.
- `docs/rfcs/0001-integrations.md` — prior art for credential handling (deliberately not reused here — see §4).
- `.claude/rules/database.md` — RLS, schema migration, and permission conventions.
- `.claude/rules/hexagonal-architecture.md` — layering rules this design is measured against.
- `.claude/rules/i18n.md` — string-handling rules for the new token-management UI.
- `apps/web/supabase/schemas/04-initial-tables.sql` — existing user / org / project schema the new table sits next to.

---

## Amendments

Changes to this RFC after the phase-1 spec landed. The RFC body (§1–§13) is frozen; every change since `/rfc-to-spec` ran is captured here as a dated, authored entry. `/rfc-to-spec` does not re-run for amended RFCs — the spec is edited in place to reflect them.

### AM-1 — 2026-04-14 — Settings dialog entry point (author: Hani Chalouati)

**Change**: The token-management UI is **no longer a standalone route**. It lives as one section inside a new **Settings dialog** opened from the account-menu "Settings" entry. The dialog is a two-pane shell — left-side navigation list (sections) and a right-side content outlet. Personal tokens is the first (and, in phase 1, only) section. Future settings sections (profile, notifications, security, …) append to the left nav via later RFCs.

**Specifically, what this overrides in the body**:

- **§1 Summary** — "The page lives at `/user/tokens`" → Token management is a pane inside a Settings dialog opened from the account menu. No new route is added in phase 1. (The `/user/*` route area intro is retracted; phase 1 introduces no new user-scoped routes.)
- **§3.1 Goal "Route `/user/tokens`"** → **Replaced** by: "Account-menu Settings entry opens a `SettingsDialog` component; its left-nav contains a 'Personal tokens' item; the right pane renders the tokens UI when selected." The `/user/*` area is deferred to a future RFC that groups settings pages under routes.
- **§3.1 Goal "Establishes the `/user/*` area"** → **Retracted**. No new route area in phase 1. The account menu entry opens a dialog, not a route.
- **§11 Open Q3 resolution** (sidebar entry point / label) → **Revised**. Menu label is **"Settings"**, not "Access tokens". It opens the Settings dialog, not a route.

**New discipline introduced by this amendment**:

- **No-nested-dialogs rule**: Because the Settings dialog is a Radix `Dialog` with a focus trap, the token create / reveal / revoke-confirm flows **must not** be stacked `Dialog` components on top of it. They become **inline pane states** inside the right-side outlet: "list" → "create form" → "reveal" → back to "list", plus a "revoke-confirm" inline-modal state. Component-split discipline: each sub-flow ships as a **content-only** component (renderable inline) + an optional `Dialog`-wrapper variant kept only if we ever need it outside the settings shell.

**What stays unchanged in the body**:

- §3.1 goals other than routing / menu (data shape, RLS, endpoints, JWT format, `is_source` coordination, scope model, compatibility with `guepard-public-api` and `guepard-cli`) are all unaffected.
- §3.2 Non-goals stand as written.
- §4 Prior art, §5 Conceptual model §5.1–§5.3 (token as a JWT, lifecycle, ownership), §5.4 two-auth-paths diagram, §7–§10 (persistence, server surface, security) — all unchanged.
- §10 Rollout plan — future phases (org-owned tokens, fine-grained scopes, opaque format) are unchanged.

**Rationale**: Post-scaffold UX review preferred grouping user-level settings under one account-menu entry ("Settings") rather than surfacing one specific setting (tokens) directly in the menu. A dialog was chosen over a page-route for phase 1 because (a) the user-scoped settings surface today has exactly one section so a full page is overkill, (b) the account menu is accessible from every shell host (organizations-layout + project-shell-host) meaning the settings dialog can open without leaving the caller's URL context, (c) URL-shareability of a single-section settings page has low current value. The trade-off — nested dialogs aren't possible — is accepted and mitigated by the inline-pane-state discipline above.

**Spec impact**: §1 Q3, §3.1 Information architecture, §3.2 Screen-by-screen (new §3.2.1 Settings dialog + renumbered subsections for inline panes), §7.5 Component inventory (split-dialog discipline), §7.8 Host-app files (delete `routes/user/tokens.tsx` and `routes/user/route.tsx`; add a `SettingsDialog` mount point), §11 i18n key map (new `settings.*` namespace; `tokens.*` entries reshaped for inline panes), §12 sequencing.

**Story impact**: Story 001 gains a task 003 to undo the direct-route wiring. A new story ("build-settings-dialog-shell") slots in between Stories 009 and 010. Story 010's scope changes from "build token list view (full page)" to "build tokens settings pane". Story 011's scope changes from "build token dialogs" to "build inline token sub-flows" (content-only components + pane-state state machine).

---

### Review checklist for the author

- [ ] Does §1 state plainly that phase 1 is a port — no new concepts, no new scope model, no new format?
- [ ] Does §2 name the concrete callers (CLI, CI, agents) driving the need?
- [ ] Is every §3.1 goal satisfiable by a phase-1 PR in v3 without touching `guepard-public-api` or `guepard-cli` beyond the table-rename coordination?
- [ ] Is every §3.2 non-goal pinned to a named future phase?
- [ ] Does §5 make the two-auth-paths picture obvious in one glance (diagram + paragraph)?
- [ ] Is there a plausible case where a session cookie and a Bearer token arrive on the same request? If yes, §5.4 needs a concrete resolution rule.
- [ ] Does §10 match realistic engineering capacity for phase 2 and beyond?
- [ ] Does every alternative in §12 have a concrete reason it was not chosen?
