# Spec — Global shell UI (phase 1)

| Field        | Value                                                                             |
| ------------ | --------------------------------------------------------------------------------- |
| Status       | Shipped — 2026-04-21                                                              |
| Author       | Hani Chalouati                                                                    |
| Created      | 2026-04-18                                                                        |
| Implements   | [RFC 0024 — Global shell UI](../rfcs/0024-global-shell-ui.md)                    |
| Target phase | Phase 1                                                                           |
| Stories      | [`docs/stories/0024/phase1/`](../stories/0024/phase1/)                            |

This document is the implementation spec for RFC 0024. The RFC establishes the *why* and *shape*; this spec defines the *what* and *how*: resolved open questions, exact data shapes, API contracts, functional flows, file-by-file work items, and a verification plan.

Scope is strict to phase 1. Everything out of scope is deferred to its own phase and does not appear here.

---

## 1. Resolved open questions

RFC 0024 §12 carries **no open questions** — every design decision raised during `/draft-rfc` was resolved inside the RFC before this spec was scaffolded. The RFC is the source of truth for those resolutions; this section is preserved so `/spec-to-stories` and future amendments have a stable anchor.

| # | Question | Resolution for phase 1 |
| - | -------- | ---------------------- |
| — | *(none — all RFC-level decisions closed in RFC §3, §5, §8, §10)* | — |

If new questions surface during spec drafting, add rows here with the resolution agreed with the author. Questions that cannot be resolved at spec time must be amended back into the RFC's open-questions section (RFC is immutable, so amendments go under `## Amendments`).

## 2. User stories

Short bulleted list of the user-visible outcomes this phase delivers. Each bullet is a *capability a user gains*, not an implementation note. This section feeds `/spec-to-stories`.

- As a signed-in user, I see the same shell (topbar + project sidebar + avatar footer) on every authenticated route except `/auth/*` and onboarding.
- As a signed-in user, a project is always in context — no page reachable via internal navigation shows "no project selected".
- As a signed-in user, I open the topbar dropdown from its trigger (`[org logo] [caret] <current project name>`) to switch project, switch organization, or reach org-scoped destinations (settings, members, billing).
- As a signed-in user, I switch organization from the dropdown and land on that org's last-used project without additional clicks.
- As a signed-in user, I create a new project from the project submenu via an inline modal that keeps me in the current shell.
- As a signed-in user, I create a new organization from the organization submenu via an inline modal; on success the shell switches to the new org and its newly-created default project.
- As a signed-in user, I open `Project settings` from the topbar dropdown and navigate its General section inside a shell app with its own internal left sidebar.
- As a signed-in user, I open `Organization settings`, `Invite members`, or `Billing & usage` from the topbar dropdown and land in the `org-settings` shell app on the General, Members, or Billing section respectively — all section content migrated from today's `/org/$slug/**` routes.
- As a signed-in user, pressing Escape or clicking outside the dropdown / submenu / modal closes it without navigating.

## 3. Functional flow

### 3.1 Information architecture

- Shell layout (topbar + project sidebar + avatar footer) wraps every authed route except `/auth/*` and onboarding.
- Topbar left = logo + caret + active project name (trigger); right = existing icons (search, notifications).
- Main area hosts the active app. App plugins register via `apps/web/src/shell/app-registry.ts`.
- New apps: `project-settings` (route base `project-settings`), `org-settings` (route base `org-settings`). Both render `SettingsShell` (from `packages/features/settings-shell`) with an internal left-sidebar of sections.
- `/organizations` route removed; redirects to the active org's last project.

### 3.2 Screen-by-screen

**Topbar trigger.** Button: org logo square (colour = org colour) + caret + project name. Hover/open state = muted background. Aria-haspopup=menu, aria-expanded reflects state.

**Dropdown (level 1).** Sections PROJECT and ORGANIZATION separated by a divider. PROJECT rows: active project (chevron → project submenu), `Project settings` (opens project-settings app). ORGANIZATION rows: active org (chevron → org submenu), `Invite members`, `Billing & usage`, `Organization settings` (each opens org-settings at the named section). Loading = skeleton rows on the two active-entity rows; data comes from already-loaded context. Error = inline message "Couldn't load". Empty impossible (always ≥1 org, ≥1 project).

**Submenus (level 2).** Anchored next to level 1. Search input (client-side filter), scrollable list with checkmark on active row, role badge on org rows, divider, `+ New X` row. Keyboard: ↑/↓ navigates, Enter selects, Esc closes.

**Create-project / Create-organization dialogs.** Modal over the shell. Fields: name (required), slug (auto-derived, editable). Submit disabled while invalid. On success: close dialog, switch context, dropdown closes too.

**Project-settings app.** `SettingsShell` host with one section: General (name, slug). Loading per-section skeleton; save button disabled until dirty.

**Org-settings app.** `SettingsShell` host with sections: General, Members, Billing, Usage. Each section wraps the existing feature package: General = new form, Members = `features/accounts` members UI, Billing = `features/billing`, Usage = `features/usage`. Deep-link `?section=members|billing|general` preselects.

### 3.3 User flows (happy paths)

1. **Open dropdown.** Click trigger → level 1 opens, focus on trigger. Click outside or Esc → closes.
2. **Switch project (same org).** Trigger → click active-project row `›` → submenu opens with current list → click target project → routes to that project's default landing, closes dropdown. Side-effect: `PATCH /api/me/preferences` writes `last_project_by_org[currentOrgId] = projectId`.
3. **Switch organization.** Trigger → click active-org row `›` → submenu opens → click target org → shell resolves `last_project_by_org[targetOrgId]` → routes to that project's default landing (or the org's default project if unset). Dropdown closes.
4. **Create project.** Submenu → `+ New project` → dialog opens → fill name → submit → `projects.create` → active project switches to new one → dialog and dropdown close.
5. **Create organization.** Submenu → `+ New organization` → dialog opens → fill name → submit → `organizations.create` (which also creates a default project) → active org switches, active project = new org's default → dialog and dropdown close.
6. **Open settings section from dropdown.** Click `Invite members` → routes to `/<org-settings-path>?section=members` → `org-settings` plugin-root mounts → inner sidebar selects Members.

### 3.4 Error and edge-case behaviour

- **Deep-link to an org the user is not a member of.** Existing unauthorized UI, unchanged (RFC §3.2, non-goal).
- **`last_project_by_org[orgId]` points to a deleted project.** `GetLastProject` falls back to the org's default project. Write is cleared lazily on next successful resolve.
- **`user_preferences.preferences` JSON fails Zod parse** (future drift, manual tampering). Service logs a warning and treats prefs as `{}`. Falls back to org default project.
- **`PATCH /api/me/preferences` fails while switching projects.** UI completes the navigation; the preference write is retried on the next route-enter (best-effort, not blocking).
- **No network at first load.** Dropdown opens with whatever shell context already has; submenus show cached org/project lists if available. Errors surface inline, not modal.
- **User has exactly one project in org.** Submenu still shows the single row + `+ New project`.
- **User has exactly one org.** Submenu still shows the single row + `+ New organization`.

## 4. Technical flow

### 4.1 Layered sequence diagrams

**Set last project (on route-enter and on project switch)**

```
UI (route guard)
  └─► shell.userPreferences.setLastProject(orgId, projectId)
        └─► HTTP adapter: PATCH /api/me/preferences { last_project_by_org: { [orgId]: projectId } }
              └─► server route: Zod-validate → SetLastProjectService
                    └─► IUserPreferencesRepository.patch(userId, patch)
                          └─► Supabase: upsert user_preferences row; jsonb merge of `preferences`
```

**Switch organization (from submenu)**

```
UI (OrgSubmenu.onSelect(orgId))
  └─► shell.organizations.switchTo(orgId)
        ├─► shell.userPreferences.getLastProject(orgId)
        │     └─► HTTP adapter: GET /api/me/preferences → returns preferences blob
        │           └─► server route: IUserPreferencesRepository.get(userId)
        │                 └─► Supabase: select from user_preferences where user_id = auth.uid()
        │     → GetLastProjectService picks preferences.last_project_by_org[orgId] ?? defaultProjectFor(orgId)
        └─► router.navigate(projectSlugPath)
```

**Open dropdown (read-only)**

```
UI (Trigger.onClick)
  └─► reads shell.organizations.list() + shell.projects.listForActiveOrg()  (already cached in React Query)
        └─► render level-1 dropdown with active entities; no network call
```

### 4.2 Component split

| Concern                                    | Package                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Dropdown trigger, level-1 menu, submenus, create dialogs | `packages/features/shell-topbar` (pure presentation)      |
| Inner-sidebar layout for settings apps     | `packages/features/settings-shell` (reused unchanged)                   |
| Project-settings shell glue (plugin-root, manifest, sections) | `packages/apps/project-settings`                      |
| Org-settings shell glue (plugin-root, manifest, sections)    | `packages/apps/org-settings`                          |
| Members / Billing / Usage internals        | `packages/features/accounts`, `billing`, `usage` (reused unchanged)     |
| Typed data client, switchTo, preferences resource | `packages/shell-runtime`                                          |
| Domain entities, ports, services           | `packages/domain`                                                       |
| Supabase / HTTP adapters                   | `packages/repositories/supabase`, `apps/web/src/lib/repositories`       |
| Routes, route guards, host layout          | `apps/web/src/routes/**`                                                |

Feature packages own presentation and accept data via props or `useShell()`; they never touch repositories directly. App packages are thin glue (plugin-root + manifest + section wrappers).

## 5. API contracts

### 5.1 Data shapes

```
UserPreferences = {
  userId: UUID,
  preferences: UserPreferencesPayload,  // validated by UserPreferencesSchema (see §6.2)
  updatedAt: ISODate,
}

UserPreferencesPayload = {
  last_project_by_org: Record<OrgId, ProjectId>,  // optional keys; missing org = no recorded last project
  // future keys tolerated via .passthrough()
}

PatchUserPreferencesInput = Partial<UserPreferencesPayload>  // merged atomically server-side
```

### 5.2 Endpoints

| Method | Path                     | Auth          | Request body                    | Response body       | Status codes                        |
| ------ | ------------------------ | ------------- | ------------------------------- | ------------------- | ----------------------------------- |
| GET    | `/api/me/preferences`    | session cookie | —                               | `UserPreferences`   | 200, 401                            |
| PATCH  | `/api/me/preferences`    | session cookie | `PatchUserPreferencesInput`     | `UserPreferences`   | 200, 400 (invalid payload), 401     |

Creation is implicit — a missing row on GET returns `{ preferences: {} }` without error. PATCH upserts.

No new endpoints for the dropdown itself: project + org listing reuse the existing `/api/organizations` and `/api/projects` resources already consumed by the shell.

### 5.3 Rate limiting, pagination, caching

- **Rate limit:** PATCH per user — 60 req/min (best-effort writes, retried on failure; higher limit than auth endpoints is safe because the payload is strictly scoped to the caller's own row).
- **Pagination:** none — `user_preferences` is a single row per user.
- **Caching:** React Query key `['user-preferences']`, staleTime 5 min; `organizations.switchTo` invalidates on write. GET response includes `Cache-Control: private, no-store` — preferences are per-user.

## 6. Data model

### 6.1 Schema

New table `user_preferences` — one row per user, JSONB payload for private prefs. Phase 1 only populates `last_project_by_org`.

| Field         | Type / constraint                                | Purpose                                                              |
| ------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| `user_id`     | `uuid` PK, FK → `auth.users.id` on delete cascade | Owning user; subject of RLS.                                         |
| `preferences` | `jsonb not null default '{}'::jsonb`             | Validated by Zod at the shell-runtime write boundary (see §6.2).     |
| `updated_at`  | `timestamptz` set by `trigger_set_timestamps()` | Last write time; eviction / debugging, not logic.                    |
| `created_at`  | `timestamptz` set by `trigger_set_timestamps()` | Audit.                                                                |

RLS — four policies, each bound to `user_id = (select auth.uid())`:
- `user_preferences_read` (SELECT)
- `user_preferences_insert` (INSERT, WITH CHECK)
- `user_preferences_update` (UPDATE, both USING and WITH CHECK)
- `user_preferences_delete` (DELETE)

No service-role path from app code. Subject to standard data-lifecycle rules (row is user-cascade-deleted with `auth.users`).

Migration file: `apps/web/supabase/schemas/NN-user-preferences.sql` (NN = next free number). Add the table, RLS, indexes (none needed beyond PK), and wire `trigger_set_timestamps()` on it. After: `pnpm supabase:web:reset && pnpm supabase:web:typegen`.

Write points: entering a project, picking a project from the submenu.
Read points: opening the org submenu, performing an org switch.

### 6.2 Config / payload contracts

Zod schema for `user_preferences.preferences` (phase 1):

```
UserPreferencesSchema = z.object({
  last_project_by_org: z.record(z.string().uuid(), z.string().uuid()).default({}),
}).passthrough()   // tolerate unknown keys written by future phases
```

Single write boundary: the `userPreferences` resource in `packages/shell-runtime/src/resources/user-preferences.ts`. All writes pass through a `mergePreferences(existing, patch)` helper that validates with `UserPreferencesSchema.parse` before `jsonb_set` (or an atomic server-side upsert).

Reads: malformed JSON is logged and treated as `{}`; the shell falls back to the org's default project.

### 6.3 Secrets contract

None. This phase introduces no secrets, no external integration credentials, and no values that need `ISecretVault`. `user_preferences.preferences` is user-owned state, not sensitive material.

## 7. File-by-file work items

Grouped by hexagonal layer, top-down. Each bullet = one file + one change. `/spec-to-stories` reads this section to derive stories.

### 7.1 Domain (`packages/domain`)

- `src/entities/user-preferences.type.ts` — Zod entity + `UserPreferencesSchema` (see §6.2).
- `src/repositories/user-preferences.port.ts` — abstract port: `get(userId)`, `patch(userId, patch)`.
- `src/services/user-preferences/get-last-project.usecase.ts` — resolve `last_project_by_org[orgId]`; fall back to org's default project.
- `src/services/user-preferences/set-last-project.usecase.ts` — merge `{ last_project_by_org: { [orgId]: projectId } }` into existing prefs.
- `src/index.ts` — re-export new entity, port, services.

### 7.2 Adapters

- `packages/repositories/supabase/src/user-preferences.repository.ts` — Supabase impl of the port.
- `apps/web/src/lib/repositories/user-preferences.repository.ts` — HTTP impl calling the server API.
- `apps/web/src/lib/repositories-factory.ts` — wire the new repo into the factory.

### 7.3 Shell runtime (`packages/shell-runtime`)

- `src/resources/user-preferences.ts` — new resource: `getLastProject(orgId)`, `setLastProject(orgId, projectId)`, `mergePreferences(patch)`.
- `src/resources/organizations.ts` — add `switchTo(orgId)` that resolves last project + navigates.
- `src/client.ts` — expose `shell.userPreferences` + `shell.organizations.switchTo`.
- `src/context.tsx` — ensure active-project invariant: on route enter, upsert last-project; on missing context, resolve via `getLastProject`.

### 7.4 Server (`apps/server`)

- `src/routes/user-preferences.ts` — Hono routes: `GET /api/me/preferences`, `PATCH /api/me/preferences` (body: partial prefs, validated via `UserPreferencesSchema.partial().passthrough()`). Atomic server-side merge.
- `src/index.ts` — mount the new routes under the authed group.

### 7.5 Presentation — feature packages

- `packages/features/shell-topbar/` — **new** feature package for the dropdown. Components:
  - `topbar-trigger.tsx` — `[org logo] [caret] <project name>` button.
  - `dropdown-menu.tsx` — level-1 menu (PROJECT + ORGANIZATION sections, divider, shortcuts).
  - `project-switcher-submenu.tsx` — search + list + checkmark + `+ New project`.
  - `org-switcher-submenu.tsx` — search + list with role badge + `+ New organization`.
  - `create-project-dialog.tsx`, `create-org-dialog.tsx` — inline modal forms.
  - `index.ts` — barrel.
- `packages/features/settings-shell/` — **reuse unchanged** as the inner-sidebar layout primitive for project-settings and org-settings apps.
- `packages/features/accounts/`, `billing/`, `usage/` — **reuse unchanged** for the migrated org-settings sections.

### 7.6 Shell apps (`packages/apps`)

- `packages/apps/project-settings/` — **new** app plugin.
  - `src/manifest.ts` — route base `project-settings`, label, icon.
  - `src/plugin-root.tsx` — mounts `SettingsShell` with sections (General only for phase 1).
  - `src/sections/general.tsx` — rename project, edit slug.
- `packages/apps/org-settings/` — **new** app plugin.
  - `src/manifest.ts` — route base `org-settings`, label, icon.
  - `src/plugin-root.tsx` — mounts `SettingsShell` with sections: General, Members, Billing, Usage.
  - `src/sections/general.tsx` — rename org, edit slug.
  - `src/sections/members.tsx` — wraps existing `features/accounts` members UI.
  - `src/sections/billing.tsx` — wraps existing `features/billing` UI.
  - `src/sections/usage.tsx` — wraps existing `features/usage` UI.
- `apps/web/src/shell/app-registry.ts` — register both new apps (via `import.meta.glob`, no codegen).

### 7.7 Host routing & layout (`apps/web`)

- `apps/web/src/routes/__root.tsx` — move shell layout wrapper here so it applies to all authed routes except `/auth/*` and onboarding.
- `apps/web/src/routes/organizations.tsx` — **delete**; replaced by a redirect.
- `apps/web/src/routes/organizations/index.tsx` or equivalent — thin redirect to active org's last project.
- `apps/web/src/routes/org/$slug/{billing,members,usage,index}.tsx` — **delete** or convert to thin redirects into the `org-settings` app's deep-links.
- `apps/web/src/routes/prj/$projectSlug.tsx` — unchanged (already shell-hosted).

### 7.8 Database (`apps/web/supabase/schemas/`)

- `NN-user-preferences.sql` — new table `user_preferences` + four RLS policies + `trigger_set_timestamps()`. Schema in §6.1.
- Run `pnpm supabase:web:reset && pnpm supabase:web:typegen` after adding.

### 7.9 i18n (`packages/i18n`)

- `src/locales/en/shell.json` — new namespace: trigger, dropdown labels, submenu placeholders, create-dialog labels.
- `src/locales/en/project-settings.json` — new namespace.
- `src/locales/en/org-settings.json` — new namespace.
- Mirror each new key into every other locale file under `src/locales/*/`.

## 8. Permissions and RLS

Seed from RFC §9:

- **New table `user_preferences`** — RLS enabled; four policies (`SELECT` / `INSERT` / `UPDATE` / `DELETE`) all bound to `user_id = (select auth.uid())`. No cross-user reads. No admin-bypass from app code. `accounts.public_data` was explicitly not used — its `accounts_read` RLS allows org-mates to read each other's rows, which would leak private navigation state.
- **Existing settings routes** (`/org/$slug/billing`, `/members`, `/usage`, and the to-be-introduced project-settings pages) — authorization unchanged from today. Moving the rendered content into the new shell apps does not relax any existing check; each section's loader and mutations reuse the existing repository / route authorization.
- **Dropdown shortcut visibility** — *not* gated by role in phase 1. Role-aware hiding is explicitly phase 2 per RFC §3.2. Any shortcut the user cannot act on falls through to the existing unauthorized-state UI; visibility is not a security control.
- **No new permission enum rows** in phase 1.

## 9. Security checklist

- [ ] `user_preferences` has RLS enabled with four explicit policies (`SELECT` / `INSERT` / `UPDATE` / `DELETE`), all bound to `user_id = (select auth.uid())`.
- [ ] No `SECURITY DEFINER` functions introduced.
- [ ] No service-role read path from application code to `user_preferences`.
- [ ] `PATCH /api/me/preferences` validates the body via `UserPreferencesSchema.partial().passthrough()` before write; invalid bodies return 400.
- [ ] Server merges payloads atomically (single `UPDATE ... SET preferences = preferences || $1::jsonb`) to avoid lost writes between concurrent tabs.
- [ ] Rate limit on `PATCH /api/me/preferences` (60 rpm per user).
- [ ] No PII added to logs (Pino redact list unchanged; preferences never logged).
- [ ] No secrets introduced by this feature; no SES / third-party integrations touched.
- [ ] Dropdown and submenu search are client-side; no network call per keystroke.
- [ ] All user-facing strings localised; no interpolation of user-controlled input without escaping.
- [ ] Shell coverage does not weaken authorization on any existing route: org-settings sections keep today's checks.
- [ ] CSP / HSTS / secure cookie flags on responses unchanged.
- [ ] No new audit event; `user_preferences` changes are low-sensitivity user prefs. If the column grows to hold sensitive fields later, revisit.

## 10. Verification plan

### 10.1 Static checks

`pnpm typecheck`, `pnpm lint`, `pnpm format`. Required green on every story before `[done]`.

### 10.2 Unit tests

- `packages/domain`: `UserPreferencesSchema` parses valid payloads, rejects invalid keys (wrong type for project id); `GetLastProjectService` returns fallback on missing / deleted project; `SetLastProjectService` produces the correct JSON patch; merge helper preserves sibling keys.
- `packages/shell-runtime`: `userPreferences.setLastProject` writes through and invalidates the right React Query key.
- `packages/features/shell-topbar`: component tests for search filter, active-item checkmark, submenu keyboard nav (↑/↓/Enter/Esc).

### 10.3 Integration tests

- `apps/server`: `GET`/`PATCH /api/me/preferences` against a local Supabase instance. Cases: empty row returns `{}`; patch merges; wrong-user context blocked by RLS; malformed body returns 400.
- `packages/repositories/supabase`: adapter round-trips a patch + read.

### 10.4 End-to-end (Playwright)

`apps/web/e2e/shell-dropdown.spec.ts`:
1. Shell renders on `/prj/:slug/dashboard`, `/prj/:slug/notebooks`, `/org/:slug/*` equivalents (now inside shell), and settings app paths.
2. Open dropdown, confirm PROJECT + ORGANIZATION sections, no ACCOUNT.
3. Switch project → URL updates, active-row checkmark moves, trigger label reflects new project.
4. Switch org → lands on that org's previously-visited project (set via a prior step).
5. `+ New project` and `+ New organization` dialogs: open, submit, context switches to created entity.
6. `Invite members` opens `org-settings` at Members; `Billing & usage` at Billing; `Organization settings` at General.
7. `/organizations` URL redirects into the active org's last project.
8. Esc + outside-click close menus without navigating.

### 10.5 Manual smoke

`pnpm dev`, sign in:
1. Visit every top-level authed route — shell is consistent.
2. Open dropdown — verify trigger label, sections, divider, no ACCOUNT.
3. Use `›` on the project row — submenu with search + `+ New project`; type to filter.
4. Switch project; reload — active project persists via URL; trigger label correct.
5. Switch org; confirm landing project = that org's last used.
6. Create a project via dialog; create an org via dialog (includes default project).
7. Navigate `Project settings` → General; try rename + save.
8. Navigate `Organization settings` → General / Members / Billing / Usage — each section renders content migrated from the old routes.
9. Paste `/organizations` — redirects into active org's last project.

## 11. i18n key map

All keys ship with English copy in `packages/i18n/src/locales/en/<ns>.json` and are mirrored (empty or translated) into every other locale file in `packages/i18n/src/locales/*/`.

**Namespace `shell`**

- `topbar.trigger.ariaLabel`
- `dropdown.section.project`
- `dropdown.section.organization`
- `dropdown.shortcut.projectSettings`
- `dropdown.shortcut.inviteMembers`
- `dropdown.shortcut.billing`
- `dropdown.shortcut.organizationSettings`
- `submenu.project.searchPlaceholder`
- `submenu.project.newProject`
- `submenu.org.searchPlaceholder`
- `submenu.org.newOrganization`
- `submenu.org.role.owner` / `.admin` / `.member`
- `dialog.newProject.title` / `.nameLabel` / `.slugLabel` / `.submit` / `.cancel`
- `dialog.newProject.error.nameRequired` / `.slugTaken`
- `dialog.newOrganization.title` / `.nameLabel` / `.slugLabel` / `.submit` / `.cancel`
- `dialog.newOrganization.error.nameRequired` / `.slugTaken`
- `errors.loadFailed`

**Namespace `project-settings`**

- `app.title`
- `sections.general.title`
- `sections.general.fields.name` / `.slug`
- `sections.general.save` / `.saved` / `.error.saveFailed`

**Namespace `org-settings`**

- `app.title`
- `sections.general.title`
- `sections.general.fields.name` / `.slug`
- `sections.general.save` / `.saved` / `.error.saveFailed`
- `sections.members.title`
- `sections.billing.title`
- `sections.usage.title`

(Internals of Members / Billing / Usage keep their existing keys in `features/accounts`, `features/billing`, `features/usage` namespaces — not re-listed here.)

## 12. Implementation sequencing

Ordered stories `/spec-to-stories` will produce. Stories can overlap within a stage; a stage cannot start until the previous stage's gates are green.

**Stage A — types and UI scaffolding**

1. Scaffold `packages/features/shell-topbar` (empty components + Storybook + exports) and the two new app packages `packages/apps/project-settings` and `packages/apps/org-settings` (manifest + empty plugin-root).
2. Create i18n namespaces `shell`, `project-settings`, `org-settings` with English keys only; mirror empty structure into every other locale.

**Stage B — data and domain**

3. Add `user_preferences` table + RLS + `trigger_set_timestamps()` via new schema file; run `supabase:web:reset` and `supabase:web:typegen`.
4. Add domain entity `UserPreferences` + `UserPreferencesSchema` + port `IUserPreferencesRepository` + services `GetLastProject` / `SetLastProject`.

**Stage C — server**

5. Implement `user-preferences.repository.ts` (Supabase adapter) and Hono routes `GET` / `PATCH /api/me/preferences` with Zod validation and atomic JSONB merge.

**Stage D — web wiring**

6. Implement HTTP adapter + wire `user-preferences` repo into `apps/web/src/lib/repositories-factory.ts`; add `userPreferences` resource and `organizations.switchTo` in `packages/shell-runtime`.
7. Apply the shell layout to every authed route in `apps/web/src/routes/__root.tsx`; delete `apps/web/src/routes/organizations.tsx` and add a redirect to the active org's last project.
8. Implement the topbar trigger, dropdown (level 1), project and org switcher submenus (level 2), and the inline create-project / create-organization dialogs — wired to `shell.organizations.switchTo` and `shell.userPreferences`.
9. Implement `project-settings` app (General section only) and `org-settings` app (General + migrated Members / Billing / Usage), both using `packages/features/settings-shell` for the inner nav; register both in `apps/web/src/shell/app-registry.ts`.

**Stage E — polish and verification**

10. Complete i18n translations across every locale; add unit tests for domain services + `mergePreferences`; add Playwright e2e covering shell-everywhere, dropdown open, project switch, org switch lands on last project, both create dialogs, and both settings apps; run `ui-validator` smoke.

## 13. Follow-ups (deferred, not in this phase)

- Role-gated visibility of dropdown shortcuts (hide `Billing & usage` for members without permission). Phase 2.
- Phase-2 settings surfaces: project API keys, Environment variables, Danger zone; org API keys, Security / SSO, Audit log, Danger zone.
- Shareable settings deep-link URLs across tenants (URL that carries org context and switches on landing).
- Global `⌘K` quick-switcher spanning projects, orgs, and pages. Phase 3.
- Narrow-screen / mobile shell redesign. Phase 3.
- Richer per-org trigger theming (logo image, full wordmark). Phase 3.
- Grid/card alternate view of all organizations (if users request one after the `/organizations` removal). Phase 3.
- Telemetry on dropdown usage (open rate, switch frequency, submenu search usage).

---

## Changelog

One line per deviation from this spec discovered during implementation. Populated by `/finish-story` when the "did the spec stay accurate?" check answers no.

- 2026-04-21 (story 009): dropped `sections.general.fields.slug` in both `project-settings` and `org-settings` namespaces — slugs are system-generated, not user-editable. §11 still lists the key; rename + remove in next phase.
- 2026-04-21 (story 009): locale JSON path is `apps/web/src/lib/i18n/locales/en/<ns>.json`, not `packages/i18n/src/locales/en/<ns>.json` as §11 prescribes. Update §11 next pass.
- 2026-04-21 (story 010): e2e spec lives at `apps/e2e/tests/shell/shell-dropdown.spec.ts` (runner: `pnpm --filter e2e test tests/shell/shell-dropdown.spec.ts`), not `apps/web/e2e/shell-dropdown.spec.ts` as §10.4 shows.
- 2026-04-21 (story 010): Dropped custom hand-rolled popover + state machine from shell-topbar; rebuilt on Radix DropdownMenu/Sub primitives (native portal, cascade anchoring, keyboard nav, outside-click). §3.2/§3.3 wording stands semantically.
- 2026-04-21 (story 010): Planned "user-settings as shell app" migration (commit 43bd817) was **deferred during close**. Conflicted with RFC 0023 story `009-implement-server-switcher-pane`, which added a desktop-only ServerPane to `settings-dialog-mount.tsx`. Preserving both requires extracting the desktop-server feature into a package first. Tracked as a follow-up; the dialog surface stays.
- 2026-04-21 (story 010): Create project + org dialogs no longer collect `slug` (server generates). §7.5 forms shrink accordingly.
- 2026-04-21 (story 010): Deviation — 2 bugfix tasks spawned mid-story (007 + 008); task 008's blast radius exceeds the validation.md 2-file gate. Justified by the Radix rewrite scope; signed off by the user.
- 2026-04-21 (story 010): Known carry-over — plugin manifest `displayName` + `nav.primary.label` + `app-registry.ts` bucket labels are still English literals. Pre-existing repo gap, tracked for phase-2 refactor.
