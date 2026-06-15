# RFC 0029 — Databases + Performance Profiles Shell Apps

| Field      | Value                                                            |
| ---------- | ---------------------------------------------------------------- |
| Status     | Accepted                                                         |
| Author     | medazizktata25                                                   |
| Created    | 2026-04-30                                                       |
| Target     | New `databases` + `performance-profiles` shell apps              |
| Supersedes | —                                                                |
| Related    | RFC 0025 (ops-compute-refactor), RFC 0026 (node-state-decomp)   |

## 1. Summary

Introduces two new first-class shell apps — **Databases** and **Performance Profiles** — that surface the existing platform deployment schema (`deployment_request`, `compute`, `performance_profile`, `db_role`) in a first-class UI. No new Supabase tables are needed; the domain layer (entities, ports, services, routes, shell resources) is completely absent and must be built.

**Phase 1 delivers:**
- `flatRoutes: FlatRouteDef[]` (plural) upgrade to `PluginManifest` — required by both apps
- Domain entities, repository ports, Supabase adapters, server routes for `Database` and `PerformanceProfile`
- `shell.databases` and `shell.performanceProfiles` on `ShellClient`
- Databases list page + app plugin (list flat route `/databases`)

**Phase 2 delivers:**
- Database detail page (Compute / Profile / Disk inline sections)
- `/database/{id}` flat route wiring
- Environments cross-link

**Phase 3 delivers:**
- Performance Profiles list page + app plugin (flat route `/performance-profiles`)
- Performance Profile detail page (Specs + Config inline sections)
- `/performance-profile/{id}` flat route wiring

## 2. Motivation

The platform already stores managed database deployments (`deployment_request`) with compute resources (`compute`), performance presets (`performance_profile`), and DB roles (`db_role`). These tables have been live since schema 38/40 but have **zero UI surface** — users cannot see, inspect, or manage their database deployments through the console.

Operators and platform admins currently have no way to:
- View the list of database deployments (per project or org-wide)
- Inspect the compute tier and performance profile attached to a deployment
- Navigate from an environment service node to the underlying database deployment
- Browse the public catalog of performance profiles available for compute instances

This RFC creates the minimal UI stack (entities → ports → adapters → routes → shell → presentation) to make all of the above possible.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- `PluginManifest` accepts `flatRoutes: FlatRouteDef[]` (plural); `flatRoute` remains as deprecated alias
- App registry and flat catch-all route handle multi-flat-route apps
- `Database` entity wraps `deployment_request` row with optional eagerly-joined `compute` + `performance_profile` + `db_role`
- `PerformanceProfile` entity wraps `performance_profile` row
- `IDatabaseRepository` and `IPerformanceProfileRepository` ports exist in `packages/domain`
- Supabase adapters for both repositories ship in `packages/repositories/supabase`
- Server routes at `/api/databases` (CRUD) and `/api/performance-profiles` (read-only) exist
- `shell.databases` and `shell.performanceProfiles` on `ShellClient`
- `/prj/{slug}/databases` renders a list page with empty state or real data
- `/databases` flat route loads and resolves project context

### 3.2 Non-goals (phase 1)

- **Database detail page.** Phase 2.
- **Performance Profiles app UI.** Phase 3.
- **Environments cross-link.** Phase 2.
- **Create / edit / delete database UI.** Phase 2+ (server route ships in phase 1 for completeness).
- **Snapshot browsing in Disk section.** Phase 2 detail scope.

## 4. Prior art in the codebase

- **Reused**: `deployment_request`, `performance_profile`, `db_role`, `compute`, `data_snapshot` tables (`40-platform-deployments.sql`, `38-platform-performance-profiles.sql`) — RFC builds the domain layer on top of existing SQL; no schema changes.
- **Reused**: `node.type.ts`, `node-repository.port.ts`, `node.repository.ts` (Supabase) — entity + port + adapter pattern mirrors this exactly.
- **Reused**: `packages/apps/infrastructure/` — manifest + plugin-root pattern to copy.
- **Reused**: `packages/features/ops/infrastructure/` — feature package layout, list-page pattern, detail-page inline-section pattern.
- **Reused**: `shell.nodes` resource in `packages/shell-runtime` — resource factory pattern.
- **Extended**: `PluginManifest.flatRoute` (singular) — extended to `flatRoutes[]` with backwards-compat alias.
- **Orthogonal**: Environments app, Node infrastructure, Topology — no changes; cross-link deferred to phase 2.

## 5. Conceptual model

### 5.1 Entity hierarchy

```
performance_profile  ──────────────────────────────────────────┐
                                                                ▼
deployment_request ──── compute (deployment_id FK)  ──► performance_profile
       │                                             (performance_profile_id FK)
       │
       └── db_role (db_user_id FK)
```

**Database** is the user-facing name for `deployment_request`. A database:
- Has a provider (postgres/mysql/redis/mongodb) and version
- Runs on a node (FK to `public.node`)
- May have an active `compute` record (which pins to a `performance_profile`)
- May have a `db_role` (superuser credentials)
- Has a status: init → pending → in_progress → created → error → deleted

**PerformanceProfile** is a CPU/memory/config preset. Public-catalog rows have `account_id IS NULL`; private rows are scoped to an account.

### 5.2 Flat route dispatch

The current `PluginManifest.flatRoute` holds exactly one `FlatRouteDef`. The Databases app requires two:
- `/databases` → list view (no params)
- `/database/{id}` → detail view (one param: `id`)

`flatRoutes?: FlatRouteDef[]` is added as the preferred field. The catch-all `$flatPrefix.$.tsx` and `AppRegistry.getByFlatPrefix()` both fall back to `flatRoute` (singular) for apps that haven't migrated. Plugin-roots that contribute multiple flat roots export `FlatRoots: Record<string, ComponentType>` (prefix → component); single-route apps continue to export `FlatRoot`.

## 6. Architecture overview

```
SQL tables (no change)
         ↓
domain entities + ports  (packages/domain)
         ↓
Supabase adapters         (packages/repositories/supabase)
         ↓
HTTP adapters             (apps/web/src/lib/repositories/)
         ↓
Server routes             (apps/server/src/routes/databases.ts)
         ↓
Shell resources           (packages/shell-runtime/src/resources/)
         ↓
Feature packages          (packages/features/ops/databases/)
         ↓
App plugins               (packages/apps/databases/)
```

## 7. Security

- All `deployment_request` / `compute` / `data_clone` / `db_role` rows are scoped to `account_id` via `is_account_owner(account_id)` policies already in `42-platform-rls.sql`.
- `performance_profile` public catalog rows (`account_id IS NULL`) are readable by all authenticated users per existing policy.
- Server routes validate session and delegate to existing RLS; no new policies needed for phase 1.
- `db_role.password` field is excluded from the `DbRole` domain entity and never serialized to the client.

## 8. Rollout plan

| Phase | Scope                                                          | Artifacts                       | Status   |
| ----- | -------------------------------------------------------------- | ------------------------------- | -------- |
| 0     | Manifest `flatRoutes[]` upgrade                                | Story 001                       | **WIP**  |
| 1     | Domain entities, adapters, server routes, list page            | `docs/specs/0029-…-phase1.md`   | Pending  |
| 2     | Database detail page, flat route, environments cross-link      | `docs/specs/0029-…-phase2.md`   | Future   |
| 3     | Performance Profiles app list + detail                         | `docs/specs/0029-…-phase3.md`   | Future   |

## 9. Open questions

1. **`accountId` ↔ `projectId` shell context**: `deployment_request.account_id` maps to `accounts.id`. Shell runtime injects `projectId` from `WorkspaceContext`. The `resolveProjectContext` function returns `{ projectId: db.accountId }`. Verify before Story 008 that the shell context load works with this mapping.

2. **`compute!deployment_id` join alias**: Supabase infers the FK name from the column name. Confirm `Tables<'compute'>` generates with `deployment_id` as the FK column before implementing the adapter join in Story 003.

## 10. Alternatives considered

- **New `managed_database` table.** Rejected — `deployment_request` is semantically identical; a new table would duplicate data and require a migration.
- **Singular `flatRoute` per app, two Databases apps.** Rejected — splitting one logical app into two packages (one for list, one for detail) would fragment nav, sidebar, and shell context resolution.
- **`FlatRoot_${prefix}` naming convention.** Considered. Rejected in favor of `FlatRoots: Record<string, ComponentType>` because the Record is a proper index rather than stringly-typed export names.

## 11. References

- `apps/web/supabase/schemas/40-platform-deployments.sql`
- `apps/web/supabase/schemas/38-platform-performance-profiles.sql`
- `apps/web/supabase/schemas/42-platform-rls.sql`
- `packages/shell-contracts/src/manifest.ts`
- `.claude/rules/hexagonal-architecture.md`
- `.claude/rules/design-system.md`
