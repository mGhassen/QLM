# `apps/e2e` — Playwright end-to-end tests

End-to-end tests for the QLM console, running against the web app in
`apps/web` and the local Supabase stack in `apps/web/supabase/`.

Layout is modeled on the reference suite in the legacy `qlm-console`
repo: page object + spec per flow, with shared helpers under
`tests/utils/`.

## Prerequisites

1. **Local Supabase must be running.** The auth suite drives real sign-up,
   which needs the auth server and Mailpit (Supabase's bundled local SMTP
   + REST mailbox — the `[inbucket]` section in `supabase/config.toml` is
   a historical name):
   ```bash
   pnpm supabase:web:start
   ```
   No `db:reset` is required — the tests don't depend on seeded users;
   they create fresh ones on every run.

2. **Browser binaries** — the root `pretest` script installs
   chromium/firefox/webkit automatically. First-time install manually
   with:
   ```bash
   pnpm exec playwright install chromium
   ```

## Running the tests

Playwright auto-starts `pnpm --filter web dev` on port 3000:

```bash
pnpm --filter e2e test              # headless run
pnpm --filter e2e test:headed       # headed browser
pnpm --filter e2e test:ui           # interactive UI mode
pnpm --filter e2e test:report       # open the last HTML report
```

If a dev server is already running in another terminal, reuse it:

```bash
E2E_REUSE_SERVER=true pnpm --filter e2e test
```

The suite runs with `workers: 1` — the tests mutate real Supabase state
and share a single Vite dev server that hits a hydration race under
concurrent load. Parallelizing saves a few seconds but makes the suite
flaky; the trade-off isn't worth it.

## Configuration

Copy `.env.example` to `.env.local` inside `apps/e2e/` to override any of:

| Variable           | Default                   | Purpose                                        |
| ------------------ | ------------------------- | ---------------------------------------------- |
| `E2E_BASE_URL`     | `http://localhost:3000`   | Base URL of the web app under test             |
| `E2E_REUSE_SERVER` | `false`                   | Skip Playwright's `webServer` launch           |
| `MAILPIT_URL`      | `http://127.0.0.1:54324`  | Mailpit REST endpoint for confirmation emails  |
| `E2E_VIDEO`        | `on`                      | `on` / `off` / `retain-on-failure`             |

## Test matrix

### Auth

| Spec file                                | What it covers                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `tests/auth/auth.spec.ts`                | Happy path: sign-up → confirm → land on `/organizations` → sign-out → sign-in → sign-out         |
| `tests/auth/sign-in-failures.spec.ts`    | Wrong password (server error) + client-side Zod blocking submit (invalid email, short password)  |
| `tests/auth/sign-up-failures.spec.ts`    | Duplicate email (server error) + client-side Zod blocking submit (invalid email, short password, mismatched repeat) |
| `tests/auth/unverified-sign-in.spec.ts`  | Edge case: sign up, skip the Mailpit confirmation, try to sign in — expect auth error alert      |
| `tests/auth/protected-routes.spec.ts`    | `AuthGuard` redirects unauthenticated visits to `/organizations` and `/org/<slug>` with `?next=…` |
| `tests/auth/password-reset.spec.ts`      | Full reset flow: request reset → follow Mailpit link → `/update-password` → sign in with new pwd |

### Organizations

| Spec file                                | What it covers                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `tests/orgs/create-org.spec.ts`          | Happy path: create dialog → valid name → redirect to `/org/<slug>`. Empty + 256-char names blocked client-side |
| `tests/orgs/list-and-navigate.spec.ts`   | Two orgs created in sequence are both visible on `/organizations`; clicking one navigates to its slug |
| `tests/orgs/members.spec.ts`             | Creator appears as primary owner on `/org/<slug>/members`; invite dialog add/remove rows; invalid email blocks submit; valid invite closes dialog |
| `tests/orgs/invite-and-join.spec.ts`     | Full invitation round trip with two browser contexts: owner creates org + invites → capture token from Supabase → invitee visits `/join/accept` → goes through `/auth/confirm` → lands on `/join` → clicks join → appears in owner-visible members list |

Server-side errors assert `[data-test="auth-error-message"]` from
`AuthErrorAlert`. Client-side Zod errors are asserted **indirectly** by
intercepting the relevant endpoint with `page.route` and failing the
test if it's hit — this keeps the specs robust against i18n churn (the
`FormMessage` primitive has no `data-test` hook). The shared helper
lives at `tests/utils/expect-no-api-call.ts`.

## Not yet tested (app gaps)

Explicit boundary so future contributors don't try to expand specs
into flows that can't assert anything yet:

- **Invitation email delivery** — `@qlm/mailers` ships with a
  Resend-only provider and there's no SMTP provider wired to Mailpit
  in local dev. The `createInvitationsAction` server-side path exists
  and the `members.tsx` POST handler dispatches to it, but when called
  the email dispatcher fails with no Resend key and `sendInvitations`
  returns `{ success: false }`. Until an SMTP mailer lands, the
  members page still calls the browser-direct `create_invitation` RPC
  on the `onInvite` callback, and `tests/orgs/invite-and-join.spec.ts`
  captures the token by querying Supabase directly via
  `tests/utils/supabase-admin.ts`.
- **CSRF verification on the `/join` POST handler** — accepted as a
  form field but not checked server-side because the rest of the app
  never renders `CsrfTokenMeta`, so `useCsrfToken()` always returns an
  empty string. Re-enable when CSRF gets wired end-to-end.
- **Delete organization** — no `DELETE` endpoint on `/api/organizations`.
- **Rename organization** — no dedicated settings route; the edit
  variant of `OrganizationDialog` isn't wired up anywhere.
- **Leave organization** — schema exists, no UI.
- **Remove member / update role / transfer ownership** — all require
  manipulating an existing membership. We can create a second member
  now (via the invite-and-join flow), but the dropdown actions on
  `AccountInvitationsTable` / `AccountMembersTable` are still TODO
  stubs in the features package.
- **Role-based negative access** — ("user B can't access org A's
  members page"). The codebase currently enforces member permissions
  in application code only; there are no RLS policies on the
  memberships table. Worth asserting once RLS lands.
- **Billing / Usage pages on `/org/<slug>/billing`, `/org/<slug>/usage`** —
  Stripe-gated or read-only; not a good e2e target.

## Layout

```
apps/e2e/
├── playwright.config.ts            # Test runner + webServer config
├── tests/
│   ├── auth/
│   │   ├── auth.po.ts              # AuthPageObject (sign-in/up/out, reset, confirm, error helpers)
│   │   ├── auth.spec.ts            # Happy path
│   │   ├── sign-in-failures.spec.ts
│   │   ├── sign-up-failures.spec.ts
│   │   ├── unverified-sign-in.spec.ts
│   │   ├── protected-routes.spec.ts
│   │   └── password-reset.spec.ts
│   ├── orgs/
│   │   ├── org.po.ts               # OrganizationPageObject (create, list, members, invite)
│   │   ├── create-org.spec.ts
│   │   ├── invite-and-join.spec.ts # Cross-context invitation + join round trip
│   │   ├── list-and-navigate.spec.ts
│   │   └── members.spec.ts
│   └── utils/
│       ├── credentials.ts          # Random email + default password
│       ├── expect-no-api-call.ts   # `page.route` interceptor for no-network assertions
│       ├── mailbox.ts              # Mailpit REST wrapper + link extractor
│       └── supabase-admin.ts       # Service-role PostgREST helper (reads invitations table)
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── .env.example
```

Tests target `data-test` attributes on the auth forms and the sidebar
`UserProfileMenu`. A handful of small testability hooks were added to
`packages/features/auth` and `packages/ui` alongside this suite
(`repeat-password-input` on the update-password form, `email-input` on
the reset-request form, `password-reset-success-alert` on the reset
success alert, `auth-submit-button` on the reset and update-password
submit buttons).

## Troubleshooting

- **Sign-up submits but confirm step times out** — Mailpit isn't
  reachable. Check `pnpm --filter web supabase status` and confirm the
  mailbox port matches `MAILPIT_URL`.
- **Sign-out step can't find the dropdown** — the `/organizations` route
  renders `UserProfileMenu` in the sidebar footer. The two `data-test`
  attributes (`account-dropdown-trigger`, `account-dropdown-sign-out`)
  live in `packages/ui/src/qlm/layout/user-profile-menu.tsx`.
- **Sign-up fails with a password error** — your local env enables
  `VITE_PASSWORD_REQUIRE_*` with rules that `Testing1234!` doesn't
  satisfy. Update `DEFAULT_PASSWORD` in `tests/utils/credentials.ts`.
- **`expect(locator).toBeVisible()` timing out on an auth form** — the
  Vite-dev hydration race. Make sure every flow that lands on an auth
  page calls `AuthPageObject.waitForAuthFormReady()` (directly or via
  one of the `goTo*` helpers) before filling inputs.
