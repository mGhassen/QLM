# RFC 0024 — Global shell UI: unified layout, topbar dropdown, org/project switcher

| Field      | Value                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------ |
| Status     | Draft                                                                                      |
| Author     | Hani Chalouati                                                                             |
| Created    | 2026-04-18                                                                                 |
| Target     | Phase 1 — unified shell layout, topbar project/org dropdown, two settings app plugins      |
| Supersedes | —                                                                                          |
| Related    | —                                                                                          |

## 1. Summary

Today the console has two navigation styles living next to each other: the project shell (topbar + project sidebar + app plugins) for anything under `/prj/**`, and plain routed pages for everything else (`/organizations`, `/org/$slug/**`). Switching from a project to the org billing page drops the sidebar; switching orgs requires backtracking to a list route. This RFC unifies the experience under a single shell that is present on every authenticated route (except `/auth/*` and onboarding), promotes the organization UI to a shell app like any other, and replaces the topbar's left-side element with a two-level dropdown that acts as both project/organization switcher and launcher for the new settings apps.

Two invariants anchor the design. First, **a project is always selected** — even while the user is reading org-level billing, there is an active project in context. Second, **there is exactly one sidebar, the project sidebar**; the organization is not a parallel top-level navigation — all cross-cutting entry points (org settings, members, billing, switching) live in the topbar dropdown, not a second sidebar.

Phase 1 ships:

- Shell layout applied to every authenticated route except `/auth/*` and onboarding.
- Topbar trigger: `[logo] [caret] <current project name>`.
- Topbar dropdown with two sections, PROJECT and ORGANIZATION (no ACCOUNT — handled by sidebar avatar).
- Each section has an active-row with a chevron submenu (search + list with role badges + `New X`) plus a small set of shortcut rows.
- Org switch auto-selects that org's last-used project per user (persisted in a new DB table with RLS).
- Two new shell app plugins — `project-settings` and `org-settings` — each with its own internal section nav (General, plus the sections migrated from today's `/org/$slug/**` routes for org-settings).
- No redundant creation entries (the section-header `[+]` pattern from PostHog is dropped).

Deferred to later phases: new settings capabilities (API keys, Environment variables, Danger zone on project; SSO, Audit log on org), a global quick-switcher keystroke, and a narrow-screen redesign.

## 2. Motivation

The current split navigation is the biggest cohesion problem in the app. A user viewing a notebook inside the project shell retains the left sidebar when they move to `Datasources` or `Query`, but the moment they click through to `Members` or `Billing` they are teleported to a different layout. Mentally, there is no continuous "where am I" thread: the org pages look like a different product.

Switching between projects or organizations is equally brittle. Today the only way to switch org is to visit the `/organizations` list, pick one, and lose the rest of the context. Users who work across multiple projects in a single org re-type slugs into the address bar because there is no switcher. This is the first complaint we hear from design partners who manage more than one customer-facing project.

The settings pages are also fragmented. `/org/$slug/billing`, `/org/$slug/members`, `/org/$slug/usage` are three plain routes with no container, no cross-section nav, and no room to grow into API keys, Security, Audit. Rolling them into a first-party shell app with an internal sidebar gives us both immediate UX parity with the rest of the console and headroom for the Phase-2 settings surface.

Finally, the topbar itself is underused. The left side currently carries a logo only. Replacing it with a PostHog-style two-level dropdown gives users the two actions they reach for most (switch project, switch org) and the half-dozen destinations they reach for next (settings, billing, invite) without adding a second navigation bar.

This RFC is engineering-scoped — it does not change business logic, ports, or auth behavior. It consumes whatever hooks and repositories exist at implementation time. It does not depend on, nor block, any other RFC.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

Each bullet is an observable exit criterion.

- The topbar, project sidebar, and avatar footer render on every authenticated route other than `/auth/*` and onboarding.
- A project is always in context on every rendered route — no page reachable via internal navigation shows "no project selected".
- The topbar trigger reads `[org logo] [caret] <current project name>` and the logo color is the active org's color.
- Opening the trigger shows a dropdown with PROJECT and ORGANIZATION sections, separated by a divider, with no ACCOUNT section.
- The PROJECT section contains: the active project row (chevron opens the project submenu), plus one shortcut row: `Project settings`.
- The ORGANIZATION section contains: the active org row (chevron opens the org submenu), plus three shortcut rows: `Invite members`, `Billing & usage`, `Organization settings`.
- Each chevron submenu contains: a search input, the list with a checkmark on the active item (org rows carry a role badge), a divider, and a `New X` row.
- Selecting a project closes the dropdown and routes to that project's default landing.
- Selecting a different org closes the dropdown and routes to that org's **last-used project** — looked up from the new `user_preferences` table (JSONB field `last_project_by_org`).
- `Project settings` opens the `project-settings` shell app at its General section.
- `Invite members`, `Billing & usage`, `Organization settings` open the `org-settings` shell app deep-linked to its Members, Billing, or General section respectively.
- `project-settings` ships as a new app plugin with at least a General section; `org-settings` ships with the sections migrated from today's `/org/$slug/**` routes (Members, Billing, Usage) plus General.
- Neither settings app appears in the project sidebar — the topbar dropdown is their sole entry point. The project sidebar stays strictly scoped to first-party project apps.
- `New project` and `New organization` in the submenus open an inline modal dialog over the current shell. On success, context switches to the newly-created entity and the dialog closes.
- The existing `/organizations` grid/list route is removed; `/organizations` redirects into the active org's default project, and all org navigation flows through the dropdown switcher.
- Pressing Escape or clicking outside closes any open menu without navigating.
- All user-facing strings in the dropdown, both settings apps, and the two create dialogs go through `t()` / `@guepard/ui/trans`.

### 3.2 Non-goals (phase 1)

- **New project-settings capabilities beyond General** (API keys, Environment variables, Integrations, Danger zone). Phase 2.
- **New org-settings capabilities beyond the migrated Members / Billing / Usage + General** (API keys, Security / SSO, Audit log, Danger zone). Phase 2.
- **Global `⌘K` quick-switcher** across projects, orgs, and pages. Phase 3.
- **Narrow-screen / mobile redesign** of the shell. Phase 3.
- **Per-org topbar theming** beyond the one-color org logo square in the trigger. Phase 3.
- **Shareable settings deep-link URLs across orgs** (i.e. routing that survives a tenant switch in a pasted link). Phase 2.
- **Role-gated visibility of dropdown shortcuts.** Phase 1 relies on the destination route's existing authorization; shortcuts themselves are shown to every member. Role-aware hiding is Phase 2.
- **A grid/card alternate view of all organizations.** Removed in Phase 1 because the dropdown switcher supersedes it. Phase 3 may revisit if users request a richer landing.
- **A friendly "pick a different org" landing when following a deep-link to an org the user is not a member of.** Phase 2. Phase 1 keeps the existing unauthorized-state page.

## 4. Prior art in the codebase

- **Reused — `packages/shell-runtime`**. The app registry, `ShellAppProvider`, and `useShell()` data client already power `/prj/**`. This RFC re-uses them unchanged; the shift is that the shell now renders on more routes and two new apps register against it.
- **Reused — `packages/apps/{dashboard, datasources, integrations, notebook}`**. The existing manifest + `plugin-root.tsx` pattern is the pattern the two new settings apps follow.
- **Reused — TanStack Router file-based routing in `apps/web/src/routes`**. Flat-URL conventions and `$param` conventions are preserved; only the layout boundary changes.
- **Replaced — `apps/web/src/routes/organizations.tsx` and `/org/$slug/{index, billing, members, usage}.tsx`**. Their rendered content migrates into sections of the new `org-settings` app; the routes either become thin redirects into the shell-app or are removed in favour of flat deep-links.
- **Replaced — the current topbar left-side element**. Whatever static `<Logo />`-style component lives there today is removed in favour of the new dropdown trigger.
- **Orthogonal — app internals** (notebook editor, datasource connectors, query engine, the agent panel from RFC 0008). The shell migration does not touch these; they keep rendering inside the same main area and continue to own their own state.
- **Orthogonal — auth routes**. `/auth/*` and onboarding explicitly stay outside the shell and are out of scope.

## 5. Conceptual model

### 5.1 The shell as the container

The shell is three fixed regions: a topbar, a project sidebar, and a main area. Every authenticated route (except the two exclusions) renders inside it. The topbar and sidebar are constant across apps; only the main area changes content as the user moves between apps.

### 5.2 Apps as plugins

An "app" is a shell plugin with a manifest and a plugin-root. Most apps render directly into the main area (dashboard, notebook, datasources). Some apps need their own internal left sidebar — for these, the plugin-root renders an inner sidebar + inner content layout inside the main area. `project-settings` and `org-settings` are apps of this second kind.

### 5.3 The always-selected project

At any moment, the shell has exactly one active project. This is guaranteed by two things: signup always produces a default organization with a default project, and every internal navigation target resolves a project from the route or from persisted context before rendering. The organization is derived from the project. The two selections are never independently ambiguous.

### 5.4 The topbar dropdown as a two-level menu

Level 1 is a compact menu organized in two sections, PROJECT and ORGANIZATION, each containing one active-entity row (with a chevron that opens level 2) and between one and three shortcut rows that launch apps or deep-link into app sections.

Level 2 is a project switcher or an organization switcher, opened from the active-entity row. It contains a search input, the full list (with an active-item checkmark; orgs additionally carry a role badge), and a single `New X` row at the bottom. Dismissal is click-outside or Escape.

Creation is centralized inside the switchers — there is no `[+]` on the level-1 section headers. The goal is one way to do each thing. `New project` and `New organization` open an inline modal dialog owned by the shell, not a navigation to a create page; the user stays anchored in the current shell surface until the create flow resolves, at which point the dialog closes and the shell switches context to the new entity.

### 5.5 Per-user, per-org last-used-project state

"Switching org" means two things atomically: the active org becomes the new org, and the active project becomes that org's last project the user was in. The mapping `(user, organization) → project` is new, durable state. It is updated whenever the user enters a project in an org, and read whenever the user switches to that org from any surface.

## 6. Navigation model

Flat URLs remain the source of truth. A route's layout boundary now has two states: "inside shell" and "outside shell". Only `/auth/*` and onboarding are "outside"; everything else is "inside". The shell does not route on its own — it is a layout wrapping the existing router.

When a user lands on a route that is an app route (e.g. a notebook), the shell resolves the project from the URL and sets context. When a user lands on an org surface (e.g. `Billing & usage`), the URL encodes project context implicitly because the project is always selected; the route hands off to the `org-settings` plugin root which reads the active org from context.

## 7. Dropdown anatomy

```
┌───────────────────────────────┐
│  PROJECT                      │
│  [ic] <active project>   ›────┼─► submenu: [🔍 search] list [+ New project]
│  [⚙] Project settings         │
│  ─────────────────────────    │
│  ORGANIZATION                 │
│  [ic] <active org>       ›────┼─► submenu: [🔍 search] list (role badge) [+ New organization]
│  [＋] Invite members          │  → org-settings → Members
│  [🧾] Billing & usage         │  → org-settings → Billing
│  [⚙] Organization settings    │  → org-settings → General
└───────────────────────────────┘
```

The two submenus are structurally identical except for the role badge on org rows and the contents of their `New X` row. Search is client-side filter over an already-loaded list (both lists are expected to be small; pagination is a later concern).

## 8. Data and persistence

Phase 1 introduces one new piece of durable state: private per-user preferences, starting with the last-used project per org. The home is a new table — **not** `accounts.public_data`, whose existing `accounts_read` RLS allows org-mates to see each other's rows and whose intent is display data (name, avatar, bio), and **not** a column on `accounts`, which would require restructuring that shared RLS.

A new `user_preferences` table owns this state. Conceptual shape:

| Field         | Meaning                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `user_id`     | Owning user (primary key; subject of RLS).                                                       |
| `preferences` | `jsonb` payload. Phase 1 shape: `{ "last_project_by_org": { "<orgId>": "<projectId>" } }`.       |
| `updated_at`  | Last write time; eviction / debugging, not logic.                                                |

Primary key: `user_id`. One row per user. RLS policies cover `SELECT` / `INSERT` / `UPDATE` / `DELETE`, all bound to `user_id = auth.uid()` — no cross-user reads, no admin-bypass from application code.

The `preferences` column is a typed JSONB bag validated by a Zod schema at the single write boundary (the shell-runtime `userPreferences` resource). Phase 1 only writes `last_project_by_org`; future phases can extend the schema without a new table. Per-field updates use `jsonb_set` (or an atomic merge in the service) to avoid overwriting siblings.

Write points: entering a project (any route under that project), switching to a project from the level-2 submenu. Read points: opening the org submenu (to preview where switching would land), performing an org switch, and (eventually) any other pref a future phase adds.

The concrete DDL, indexes, and the trigger/hook strategy are spec-level concerns.

## 9. Security and trust boundaries

Authorization for the underlying resources is unchanged. The shortcuts in the dropdown link to routes whose existing authorization already governs access; an unauthorized user clicking `Organization settings` lands on the existing unauthorized-state UI, not a broken page. Role-gated visibility of shortcuts is explicitly phase 2 — it is a polish item, not a security control.

The `user_preferences` table is new PII (it ties a user to their private navigation state and any future preference fields). RLS is mandatory and covers all four operations with `user_id = auth.uid()`. No service-role reads from app code. The table is in scope for the standard data-lifecycle rules (soft delete → hard delete after 90 days for user-owned data). The JSONB payload is validated by a Zod schema at the single application-side write boundary; malformed reads are ignored gracefully and the shell falls back to the org's default project.

Copy in the dropdown and in both settings apps is localised. No user-controlled string is rendered without escaping. Dropdown submenu search is a pure client-side filter and does not issue network calls per keystroke.

## 10. UX surface and product integration

The dropdown is anchored to the left of the topbar. The trigger is visible on every shell route; there is no surface where it is hidden (except routes outside the shell). The PROJECT and ORGANIZATION sections are always both visible, even if the user has only one project or one org; creation is still reachable from the submenu.

Both settings apps are first-class shell apps but their only entry point is the topbar dropdown. Neither appears in the project sidebar. The sidebar stays strictly project-scoped — the first-party project apps only — which preserves a clean "my project's tools live here, everything cross-cutting lives in the topbar" split.

The `/organizations` grid/list route is removed as part of this RFC. Any lingering link to it redirects into the active org's default project. Users reach other orgs through the dropdown's ORGANIZATION submenu exclusively.

An interactive HTML mock of the approved design lives at `docs/rfcs/0024-global-shell-ui/mock.html`.

## 11. Rollout plan

| Phase | Scope                                                                                                                                                                                                                                                        | Artifacts               | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------ |
| 1     | Shell-on-everything, topbar dropdown with switcher + shortcuts, `project-settings` and `org-settings` app plugins (General section + migrated org sections), last-used-project persistence. Matches the approved mock.                                        | This RFC + phase-1 spec | Draft  |
| 2     | Settings surface growth: API keys (project + org), Environment variables (project), Danger zone (both), Security / SSO (org), Audit log (org). Role-gated shortcut visibility in the dropdown. Shareable settings deep-links across tenants.                 | Phase 2 RFC             | Future |
| 3     | Global `⌘K` quick-switcher (projects + orgs + pages), narrow-screen / mobile shell, richer per-org theming in the trigger.                                                                                                                                    | Phase 3 RFC             | Future |

## 12. Open questions

*All design decisions raised during `/draft-rfc` rounds were resolved and folded into §3, §5, §8, and §10. No open questions remain. The spec for phase 1 can be scaffolded directly from this RFC.*

## 13. Alternatives considered

- **Keep org routes outside the shell (today's behaviour).** Rejected — it is the exact problem this RFC exists to fix.
- **Two parallel sidebars (project vs org).** Rejected — doubles the navigation surface for a feature that is single-org for most users on most days.
- **Merge project-settings and org-settings into one `settings` app with a scope toggle.** Rejected — the two domains are distinct, their sections don't overlap, and users will look for them as separate destinations.
- **Restore an ACCOUNT section inside the dropdown.** Rejected — duplicates the avatar/footer menu in the sidebar, which already handles sign-out and account preferences.
- **Persist last-used-project in `localStorage` only.** Rejected — does not survive device switch or fresh browser. A durable table is the correct level of rigor for a feature users hit daily.
- **Store last-used-project on `accounts.public_data`**. Rejected — the existing `accounts_read` RLS lets org-mates read each other's rows, so private navigation state would leak to coworkers. The column's name also signals display-facing data (name, avatar), not private prefs.
- **Add a new column on `accounts` (e.g. `preferences jsonb`)**. Rejected — would either inherit the shared-read RLS (same leakage) or force a per-column RLS workaround (views, or a restructured policy) that complicates a well-established table.
- **One typed table per preference kind (e.g. `user_last_project`).** Rejected — every new pref would need a new migration + new port + new resource. The JSONB bag in `user_preferences` is a single write boundary with a Zod schema and trivial extension.
- **Keep the `/organizations` grid page as an alternate landing.** Rejected — two surfaces for the same action (switch org) is exactly the fragmentation this RFC exists to remove. Users who miss a grid view can raise it for phase 3.
- **Route `+ New project` / `+ New organization` to dedicated create pages.** Rejected — create flows here are one or two fields; a modal keeps the user anchored. If a richer create surface is needed later (branding, initial seats for orgs), the modal can grow without changing the invocation pattern.
- **Silently redirect a deep-link into an org the user isn't a member of to their own org.** Rejected — hides the failure, risks confusion, and does not meaningfully improve on the existing error UI.

## 14. References

- `docs/rfcs/0024-global-shell-ui/mock.html` — interactive HTML mock of the approved design.
- `.claude/rules/architecture.md` — monorepo layout and app-plugin conventions.
- `.claude/rules/hexagonal-architecture.md` — shell-runtime + ports + adapters boundaries.
- `.claude/rules/database.md` — RLS and schema-migration conventions.
- `.claude/rules/i18n.md` — translation requirements for all new copy.
- `.claude/rules/conventions.md` — TanStack Router file-based routing, path helpers.
- `packages/shell-runtime/` — existing shell runtime (re-used unchanged).
- `packages/apps/{dashboard,datasources,integrations,notebook}/` — existing app plugins (pattern to follow).

---

## Review checklist for the author

- [ ] Does §1 make the scope obvious in one paragraph?
- [ ] Is every §3.1 goal an observable exit criterion?
- [ ] Is every §3.2 non-goal pinned to a named future phase?
- [ ] Does §4 distinguish reused prior art from replaced prior art?
- [ ] Would a newcomer understand the concept after reading only §1 through §5?
- [ ] Are the open questions real decisions, or are any of them placeholders?
- [ ] Does the rollout plan match realistic engineering capacity for the next quarters?
- [ ] Does every alternative in §13 have a concrete reason it was not chosen?
