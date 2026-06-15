# RFC 0006 — Datasources

| Field      | Value                                                |
| ---------- | ---------------------------------------------------- |
| Status     | Accepted — phase 1 shipped 2026-04-11                |
| Author     | Hani Chalouati                                       |
| Created    | 2026-04-11                                           |
| Target     | Phase 1 — project-scoped datasource primitive as implemented in the console today |
| Supersedes | —                                                    |
| Related    | [RFC 0001 — Integrations](./0001-integrations.md) (sibling primitive — cloud-account credentials vs. data-source credentials). Downstream consumers: notebooks (query cells), environments (RFC 0004), agent-factory SDK. |

> **Documentation intent.** This RFC is written **post-hoc to establish a lineage baseline** for the datasources feature as it exists in the console today. It is not a forward-looking design doc. Every primitive, every port, every table column, every shell method, every UI surface described below already exists in the codebase at the time this RFC was accepted. Future changes to datasources land either as amendments at the bottom of this RFC (small deltas) or as new phases / new RFCs (meaningful scope expansions). The purpose is to give the feature a stable SDD-compatible anchor so subsequent work can be diffed against a known baseline instead of drifting.

## 1. Summary

**Datasources** is the project-scoped primitive that represents a single named connection to an external data source — a network database (Postgres, ClickHouse, MySQL, MongoDB), an in-browser engine or file bundle (DuckDB-WASM, Parquet, CSV, JSON), a cloud object store (S3), or a SaaS API (Google Sheets, YouTube Data API). A datasource is owned by a project, typed by a `{ datasource_provider, datasource_driver, datasource_kind }` triple, and carries a JSON `config` blob whose shape is governed by the driver's Zod schema.

Datasources are the binding target for every data-reading surface in the console: the notebook plugin runs SQL cells against them, the federated query engine attaches them at execution time, the schema browser probes them for metadata, and the agent-factory SDK will consume them by id. A project has many datasources; a datasource belongs to exactly one project.

Phase 1 shipped the following, end-to-end:

- A Zod-validated `DatasourceEntity` in `packages/domain`, with CRUD use-case services, a repository port, Supabase and HTTP adapters, and a `shell.datasources.*` resource on the shell runtime.
- A `packages/apps/datasources` plugin app registered automatically by the Vite-glob app registry under the `data` bucket in the project shell, with a list view, a driver browser + connect sheet, and a detail view with **Settings**, **Tables**, and **Schema** tabs.
- A driver plug-in contract (`@qlm/extensions-sdk`) with 14 driver packages under `packages/extensions/*`, split across **browser runtime** (DuckDB-WASM, PGlite, ClickHouse-WASM, CSV / Parquet / JSON online, Google Sheets CSV, YouTube Data API) and **node runtime** (PostgreSQL, MySQL, ClickHouse-node, MongoDB, S3, DuckDB-native). A browser / node dispatcher in the web shell routes `testConnection` and `metadata` calls to the right runtime.
- A three-state visibility model encoded in RLS: **organisational** (`is_private = false AND is_public = false`), **private** (`is_private = true`), **public** (`is_public = true`), gated by two permissions on `public.app_permissions`: `datasources.manage` and `datasources.publish`.
- An i18n namespace `datasources` covering the list view, connect flow, detail tabs, and toast messages.

Everything in §3 through §11 is a description of that shipped state. §12 catalogues known deviations from the stricter SDD / hexagonal rules that landed after the feature was first built — captured here so future work has a baseline to reconcile against, not re-invent.

## 2. Motivation

The console needs a first-class primitive for "a thing that speaks a known protocol at a known address", because every data surface in the product binds to one:

**Notebooks need a stable binding target.** A notebook cell is "a SQL expression evaluated against a named datasource". Without a datasource entity that has an id, a lifecycle, and a permission model, notebooks would have to embed raw connection strings in cell metadata — non-shareable, non-auditable, impossible to rotate. The datasource primitive gives cells a stable id to bind to.

**The federated query engine needs a uniform attach surface.** QLM's query engine attaches multiple sources into a single query (`attach(datasources[])` / `detach(datasources[])` on the query-engine port). For that to work, every source has to flow through *one* contract: a driver with `testConnection`, `metadata`, and a query entry point. Datasources are the row that holds the driver's inputs; drivers are the code that honours the contract.

**Browser-local and server-side drivers are both first-class citizens.** Some providers naturally live in the browser (DuckDB-WASM on in-memory Parquet, PGlite on a local file, CSV parsed in the page). Others are strictly server-side (Postgres over the network, S3 with credentials, MongoDB). The datasource primitive must accommodate both without forcing one onto the other — forcing every driver server-side would make browser-local datasets pointlessly slow; forcing every driver browser-side would leak database credentials into the client. The dispatcher that routes by `runtime: 'browser' | 'node'` is therefore part of the primitive, not an optimisation.

**Visibility has three distinct meanings.** A datasource can be private to its creator (individual exploration), shared with the project's organisation (team collaboration), or made public to every authenticated user (remix seeds — canonical public datasets the community forks into their own projects). Each is a separate RLS posture with different write rules and different permissions, so the primitive has to carry visibility as a first-class field.

Datasources are an upstream dependency of notebooks, the schema browser, federated query, environments (RFC 0004), and the agent-factory SDK. Nothing in the codebase modelled this concept as its own entity before this feature landed — the query engine had the attach surface, the extensions SDK had the driver contract, the notebook app had cells — but nothing bound them together. This RFC documents that primitive as it was built.

## 3. Goals and non-goals

### 3.1 Goals (phase 1) — shipped

Every bullet below is an observable exit criterion that the current implementation satisfies.

- A Zod-validated `DatasourceEntity` in `packages/domain/src/entities/datasource.type.ts`, carrying `id`, `projectId`, `name`, `description`, `slug`, `datasource_provider`, `datasource_driver`, `datasource_kind` (`embedded` | `remote`), `config` (passthrough object), `isPublic`, `remixedFrom`, and audit fields.
- A repository port `IDatasourceRepository` in `packages/domain/src/repositories/` with `findByProjectId`, `findById`, `findBySlug`, `create`, `update`, `delete`, and a `revealSecrets` hook reserved for future encryption at rest.
- CRUD use-case services in `packages/domain/src/services/datasources/`: `CreateDatasourceService`, `UpdateDatasourceService`, `DeleteDatasourceService`, `GetDatasourceService`, `GetDatasourceBySlugService`, `GetDatasourcesByProjectIdService`, plus a `TransformMetadataToSimpleSchemaService`.
- Two adapters implementing the port: a Supabase adapter in `packages/repositories/supabase/src/datasource.repository.ts` and an HTTP adapter in `apps/web/src/lib/repositories/datasource.repository.ts`.
- A `datasources` resource on the shell runtime (`packages/shell-runtime/src/resources/datasources.ts`) exposing `list`, `getById`, `getBySlug`, `create`, `update`, `delete`, `testConnection`, `metadata`, plus React-Query `invalidate` helpers (`all`, `list`, `detail`, `metadata`).
- Hono routes in `apps/server/src/routes/datasources.ts` wiring the CRUD surface: `GET /` (by project), `GET /:id` (by uuid or by slug), `POST /`, `PUT /:id`, `DELETE /:id`.
- A plugin app `packages/apps/datasources` discovered by `apps/web/src/shell/app-registry.ts`, with a `routeBase: 'datasources'` under the project shell and a `flatRoute` prefix `datasource` for shareable short URLs.
- Feature components in `packages/features/datasources/src/components`: `DatasourceList`, `DatasourceBrowser`, `DatasourceConnectSheet`, `DatasourceConnectForm`, `DatasourceDetailSidebar`, `DatasourceSettingsPanel`, `DatasourceTablesPanel`, `DatasourceColumnsPanel`, `DatasourceSchemaPanel`, `DatasourceDocsLink`.
- A driver plug-in contract in `@qlm/extensions-sdk`, with 14 driver packages under `packages/extensions/*` split across browser and node runtimes (see §7 for the full list).
- A browser / node dispatcher (`apps/web/src/shell/driver-dispatch.ts`) that resolves the runtime per driver and either invokes the driver in-process (browser runtime) or forwards the call to the server via `POST /driver/command` (node runtime).
- A RLS-protected `public.datasources` table in `apps/web/supabase/schemas/22-datasources.sql` with three SELECT policies (organisational / private / public), a public-anon read policy, and INSERT / UPDATE / DELETE policies gated by `datasources.manage` and `datasources.publish` permissions on `public.app_permissions`.
- An i18n namespace `datasources` in `apps/web/src/lib/i18n/locales/en/datasources.json` covering list, browser, connect, detail (Settings / Tables / Schema), delete-confirm, and error-toast surfaces.
- The primitive is consumed by the query-engine attach surface (`packages/domain/src/ports/query-engine.port.ts`) and is the binding target for notebook cells via `shell.datasources.*` on the shell client.

### 3.2 Non-goals (phase 1)

Each non-goal is a deferred item pinned to a named future phase.

- **Vault-backed credential storage.** Phase 1 stores the datasource `config` (including any secret fields) as plaintext JSONB. The repository port exposes a `revealSecrets` hook that is currently a pass-through. Migrating to `ISecretVault` (the seam shipped by RFC 0001) is a **phase 2** item.
- **Declarative driver discovery.** Phase 1 ships a hand-maintained `EXTENSIONS` array in `packages/extensions-loader/src/index.ts`. Replacing it with a Vite-glob or a `package.json#contributes` walker is **phase 2**.
- **Entity-level visibility field.** The RLS policies enforce three visibility states through the `is_private` and `is_public` columns, but the `DatasourceEntity` exposes only `isPublic`. Adding `isPrivate` to the entity and a collapsed `visibility` enum on the DTO is **phase 2**.
- **Remix flow UI.** The schema reserves `remixed_from uuid` and the write policy allows insert when `remixed_from IS NOT NULL`, but no UI lands in phase 1 to discover or fork public datasources. **Phase 2.**
- **New driver families beyond the shipped set.** The 14 drivers in §7 are the phase-1 set. Azure SQL, BigQuery, Snowflake, Redis, Elasticsearch, Kafka, etc. are **phase 3+** driver drops.
- **Federated multi-source query rework.** The `attach(datasources[])` surface on the query-engine port is consumed, not redesigned. A federated query RFC is its own thing. **Phase 4.**
- **Dataplane-local datasources.** Datasources whose driver runs inside a private node (RFC 0001 phase 2) rather than being reached from the control plane. **Phase 5**, blocked on the dataplane node primitive.
- **Agent-SDK datasource loader.** The agent factory consuming datasources by id with a dedicated auth boundary. **Phase 6.**
- **Credential rotation UX, audit log, usage analytics, drift detection.** Operational maturity. **Maybe later.**

## 4. Prior art in the codebase

- **Reused**: `packages/extensions-sdk` — the driver plug-in contract (datasource extension, driver factory, runtime marker, Zod schema). The SDK predates this RFC; the datasources primitive is one of its consumers.
- **Reused**: `packages/domain/src/common/entity.ts` — the base `Entity` class with `class-transformer` `@Expose` / `@Exclude`, mirrored by every other domain entity.
- **Reused**: `packages/shell-runtime` resource pattern. `shell.datasources` is built with the same structure as `shell.notebooks`, `shell.projects`, etc.
- **Reused**: `packages/ui` `EntityListPage` wrapper — the standard search / sort / grid-vs-table list container used across list views.
- **Reused**: `apps/web/supabase/CLAUDE.md` RLS, permission-enum, and trigger conventions.
- **Orthogonal**: `packages/domain/src/ports/query-engine.port.ts` — the federated query engine attaches datasources at runtime. Its `attach(datasources[])` surface is the downstream contract datasources feed into; the query engine itself is not owned by this RFC.
- **Orthogonal**: RFC 0001 integrations. Integrations model a *cloud account* used for provisioning and ingestion. Datasources model a *data source* used for queries. They share the extensions-SDK pattern as prior art but have independent entities, ports, tables, and permissions.
- **Orthogonal**: `packages/apps/notebook` — the largest downstream consumer; it binds cells by datasource id but is not re-engineered here.
- **Reused, with a deviation**: `packages/domain/src/repositories/secret-vault.port.ts` — the `ISecretVault` seam shipped by RFC 0001. Datasources **do not** currently use the vault; the hook is in place on the repository port but is a pass-through. Adopting the vault is the phase-2 milestone.

## 5. Conceptual model

### 5.1 Entity

A datasource is a named, project-scoped pointer to a single external source. Its natural key is `(project_id, slug)`. Its shape is:

- **Provider** (`datasource_provider`) — the extension family (e.g. `postgresql`, `duckdb`, `clickhouse`). The *what kind of thing* answer.
- **Driver** (`datasource_driver`) — a concrete driver inside the provider family (e.g. `postgresql.default`, `duckdb.wasm`, `clickhouse.web`). The driver id is what the runtime instantiates.
- **Kind** (`datasource_kind`) — `embedded` or `remote`. `embedded` means the data is local to the driver (in-browser engine, bundled file, user upload). `remote` means the driver reaches across a network boundary to a separately-hosted engine.
- **Config** — a passthrough JSON object whose shape is defined by the driver's Zod schema. Contains the non-secret connection inputs (host, port, database, region, bucket, file glob, TLS flag) **and, in phase 1, any secret fields the driver exposes** (password, access key, service-account JSON). Vault-isolation of secret fields is the phase-2 milestone.
- **Audit fields** — `created_at`, `updated_at`, `created_by`, `updated_by`.
- **Visibility** — `is_public` on the entity (and on the DB), `is_private` on the DB only. The three valid combinations are described in §5.3.
- **Remix pointer** — `remixed_from` uuid, nullable. Populated when a datasource is created by forking a public one. UI for discovery is phase 2; the field exists today.

The entity lives in `packages/domain`, is pure TypeScript, and is a value-object snapshot (Zod-parsed, `class-transformer`-decorated, factory methods `DatasourceEntity.create` / `.update`). The port never leaks a concrete adapter class.

### 5.2 Drivers

A driver is a plug-in contributed by a `@qlm/extension-*` package. Every driver declares:

- **Identity** — extension id + driver id pair, human-readable name, icon reference, docs URL.
- **Schema** — a JSON-Schema description of the non-secret `config` (converted to Zod at runtime via `@qlm/extensions-sdk/json-schema-to-zod`). In phase 1, secret fields are *not* annotated separately; they are just fields in the schema and flow into the same `config` blob.
- **Runtime** — `browser` or `node`. The dispatcher in `apps/web/src/shell/driver-dispatch.ts` reads this marker to decide where to execute test-connection and metadata calls.
- **Operations** — a `DriverFactory` that returns a driver instance with `testConnection`, `metadata` (schemas / tables / columns / relationships), and the query surface consumed by the query engine.

Drivers are registered today through a hand-maintained `EXTENSIONS` array in `packages/extensions-loader/src/index.ts` that imports the extension packages and registers their contributions with `ExtensionsRegistry`. The datasources plugin root initialises this registry on mount via `initDatasourceRegistry()` and lazy-loads a driver's schema via `useExtensionSchema()`.

### 5.3 Visibility

Every datasource has one of three visibility states, enforced by RLS policies in `22-datasources.sql`:

- **Organisational** — `is_private = false AND is_public = false`. Readable by every member of the project's organisation; writable by the creator if they hold `datasources.manage` (or are an org owner). This is the default state for datasources created in a team context.
- **Private** — `is_private = true`. Readable only by the creator. Writable by the creator if they hold `datasources.manage` (or are an org owner).
- **Public** — `is_public = true`. Readable by any authenticated user *and* by anonymous (`anon`) visitors via a dedicated SELECT policy. Only insertable by a creator who holds `datasources.publish` (or is an org owner). **Once public, a datasource cannot be updated or deleted via the standard policies**; unpublishing requires a dedicated function (not shipped).

The entity surfaces `isPublic` only. The `is_private` column is enforced at the RLS layer but is not currently projected onto the entity or the update DTO. See §12 "known deviations".

### 5.4 Lifecycle

- **Created** — row exists, config stored, visibility set at creation time. No automatic test is run.
- **Tested** — `shell.datasources.testConnection(...)` is called through the driver dispatcher. The result is returned to the UI; **no test status is persisted on the row** in phase 1.
- **Metadata probed** — `shell.datasources.metadata(...)` is called through the same dispatcher. Schemas / tables / columns / relationships are fetched live on every call and never persisted.
- **Updated** — `PUT /datasources/:id`. Subject to the RLS UPDATE policy (`created_by = auth.uid() AND is_public = false`, plus `datasources.manage`).
- **Deleted** — `DELETE /datasources/:id`. Subject to the RLS DELETE policy (same gate as update).

Test results and metadata are always fetched on demand. There is no background refresher, no cached schema, no staleness indicator.

## 6. Architecture overview

```
apps/web                                          apps/server
  └─ routes/prj/$projectSlug/...                    └─ routes/datasources.ts
         │  (React UI via plugin app)                    │  (Hono routes)
         ▼                                                 ▼
  packages/apps/datasources                         domain services
  ├─ manifest.ts                                    ├─ CreateDatasourceService
  ├─ plugin-root.tsx                                ├─ UpdateDatasourceService
  ├─ use-datasource-metadata.ts                     ├─ DeleteDatasourceService
  └─ use-extension-schema.ts                        ├─ GetDatasourceService
         │                                           ├─ GetDatasourceBySlugService
         ▼                                           └─ GetDatasourcesByProjectIdService
  shell-runtime                                            │
  └─ resources/datasources.ts                              ▼
         │                                          IDatasourceRepository
         ▼                                          (port, packages/domain)
  driver-dispatch.ts                                       │
  ├─ browser runtime (in-process)                          ├─ SupabaseDatasourceRepository
  │     DuckDB-WASM, PGlite, ClickHouse-WASM,              │   (packages/repositories/supabase/...)
  │     CSV, Parquet, JSON, GSheet-CSV,                    └─ HttpDatasourceRepository
  │     YouTube Data API                                         (apps/web/src/lib/repositories/...)
  └─ node runtime (POST /driver/command)                           │
        PostgreSQL, MySQL, ClickHouse-node,                         ▼
        MongoDB, S3, DuckDB-native                          public.datasources
                                                            (RLS-protected, Supabase)
```

Three orthogonal ports / registries:

- **Persistence** — `IDatasourceRepository`, with Supabase and HTTP adapters.
- **Driver registry** — `ExtensionsRegistry` from `@qlm/extensions-sdk`, initialised at plugin-root mount time from the hand-maintained loader array.
- **Driver dispatch** — `apps/web/src/shell/driver-dispatch.ts`, the thin runtime-aware router that turns `(provider, driverId, config)` into a `testConnection` or `metadata` call against the right runtime.

Browser-runtime drivers execute inside the plugin app — test and metadata calls stay client-side. Node-runtime drivers execute inside the server — the plugin app calls the shell resource, which calls the dispatcher, which posts to `/driver/command`. The shell runtime hides the split from the UI: the plugin calls `shell.datasources.testConnection(...)` and does not care which side runs.

The agent SDK and the federated query engine are downstream consumers: they are handed a datasource id, call the shell resource, and get back results. They never touch the repository or the driver registry directly.

## 7. Driver set

The 14 driver packages shipped under `packages/extensions/*` in phase 1:

**Browser runtime** (driver runs in the user's browser, in-process):

- `@qlm/extension-duckdb-wasm` — DuckDB compiled to WebAssembly, for ad-hoc SQL on in-memory data.
- `@qlm/extension-pglite` — Postgres compiled to WebAssembly (via PGlite), for local Postgres-compatible experimentation.
- `@qlm/extension-clickhouse-web` — ClickHouse browser driver.
- `@qlm/extension-csv-online` — CSV file parsed in the browser, queried via DuckDB-WASM under the hood.
- `@qlm/extension-parquet-online` — Parquet file fetched and queried in the browser.
- `@qlm/extension-json-online` — JSON file parsed and queried in the browser.
- `@qlm/extension-gsheet-csv` — Google Sheets exported as CSV and queried in the browser.
- `@qlm/extension-youtube-data-api-v3` — YouTube Data API v3, queried as a virtual tabular source.

**Node runtime** (driver runs on the server, reached by the browser via `POST /driver/command`):

- `@qlm/extension-postgresql` — PostgreSQL over the network.
- `@qlm/extension-mysql` — MySQL over the network.
- `@qlm/extension-clickhouse-node` — ClickHouse server driver.
- `@qlm/extension-mongodb` — MongoDB native driver.
- `@qlm/extension-s3` — S3 object listing + object fetch.
- `@qlm/extension-duckdb` — DuckDB native (non-WASM).

A `postgresql-supabase` and a `postgresql-neon` extension are reserved slots in the loader registry; the packages themselves are not shipped in phase 1.

## 8. Data model

One table, numbered `22-datasources.sql` in `apps/web/supabase/schemas/`:

- **Table** `public.datasources`.
- **Key columns**: `id uuid primary key`, `project_id uuid` with foreign key to `public.projects(id)`, `slug text`, unique on `(project_id, slug)`.
- **Descriptive columns**: `name text`, `description text`.
- **Typing columns**: `datasource_provider text`, `datasource_driver text`, `datasource_kind text` (`embedded` | `remote`).
- **Payload column**: `datasource_config jsonb` (non-secret and secret mixed in phase 1).
- **Visibility columns**: `is_private boolean`, `is_public boolean`. The three valid combinations: organisational (`false, false`), private (`true, false`), public (`?, true`).
- **Remix column**: `remixed_from uuid` nullable, foreign key to `public.datasources(id)`.
- **Audit columns**: `created_at`, `updated_at`, `created_by`, `updated_by`. Maintained by `public.trigger_set_timestamps()` and `public.trigger_set_user_tracking()` triggers declared in the schema file.

**Permissions**. Two values on `public.app_permissions`: `datasources.manage` (required to write organisational and private datasources) and `datasources.publish` (required to create public datasources). Both are pre-existing on the enum in the shipped schema.

**RLS policies** (file: `22-datasources.sql`):

- `datasources_read` (authenticated SELECT) — unions three clauses: organisational-datasource-of-a-member-org, own-private-datasource, or any public datasource.
- `datasources_read_public` (anon SELECT) — `is_public = true`. Allows unauthenticated pages to read public datasets.
- `datasources_write` (authenticated INSERT) — `created_by = auth.uid()` and one of: organisational with `datasources.manage`, private with `datasources.manage`, public with `datasources.publish`, or a remix row (`remixed_from IS NOT NULL`).
- `datasources_update` (authenticated UPDATE) — `created_by = auth.uid() AND is_public = false`, and org / permission gate. Public datasources are frozen from update via the standard policy.
- `datasources_delete` (authenticated DELETE) — same shape as update. Public datasources are frozen from delete via the standard policy.

## 9. Security

- **Row-level security** on every path. Three visibility postures, two permissions, and a creator-identity check on every write. Unpublish is deliberately not exposed as a direct UPDATE; it would need a dedicated SECURITY DEFINER function with its own access checks (not shipped in phase 1).
- **Anonymous read of public rows** is allowed by the `datasources_read_public` policy, so public datasources can be rendered on unauthenticated pages (e.g. a remix landing page). This is load-bearing for the remix story even though the UI ships in phase 2.
- **Secrets in `datasource_config`** are stored in plaintext JSONB in phase 1. The repository port has a `revealSecrets` hook reserved for future encryption at rest, but it is currently a pass-through. Vault adoption is the phase-2 milestone. This is the biggest known gap in phase 1's security posture and is tracked as a known deviation in §12.
- **Browser-runtime drivers** receive their config directly in the browser context, through the normal Supabase / HTTP read path (subject to RLS). Node-runtime drivers reveal config only on the server inside the `/driver/command` handler, and the raw config is scoped to the driver call.
- **Rate limiting** on `/driver/command` is handled by the existing server-side `rate-limiter.ts`. There is no dedicated datasource-test rate limit in phase 1.
- **Destructive operations** in phase 1 are restricted to the standard DELETE policy (creator + permission + not public). There is no soft-delete, no trash, no cascade beyond the `ON DELETE CASCADE` on the `project_id` foreign key.

## 10. UX surface

- **Entry point**: the `datasources` plugin app, discovered by `apps/web/src/shell/app-registry.ts`. Nav entry under the `data` bucket at order 5. `routeBase: 'datasources'` for the contextual URL `/prj/{projectSlug}/datasources`, and `flatRoute.prefix: 'datasource'` for shareable short URLs like `/datasource/{slug}`.
- **List view**: `EntityListPage` wrapper — search, sort (name / date), grid-vs-table toggle. `DatasourceList` renders cards with name, provider icon, creator display name, and created date.
- **Driver browser**: `DatasourceBrowser` — grouped by provider family with search. Empty state points at a "request a new datasource" affordance.
- **Connect flow**: `DatasourceConnectSheet` + `DatasourceConnectForm`. The form is rendered dynamically from the driver's Zod schema (converted from JSON Schema at runtime via `useExtensionSchema()`). Includes an inline "Test Connection" button that calls `shell.datasources.testConnection(...)`, plus a randomisable name field and a docs link per driver (`DatasourceDocsLink`).
- **Detail view**: `DatasourceDetailSidebar` + three tabs, managed by the plugin's flat-route detail page.
  - **Settings** (`DatasourceSettingsPanel`) — rename, re-configure the connection, re-test, delete.
  - **Tables** (`DatasourceTablesPanel` + `DatasourceColumnsPanel`) — live schemas / tables list with column drill-down. Schema filter by database schema when the driver reports more than one.
  - **Schema** (`DatasourceSchemaPanel`) — ER-style graph of the relationships returned by the metadata probe, when the driver supports relationship discovery.
- **Contextual help**: per-driver docs link exposed in the connect flow and the detail sidebar. RFC 0005 contextual help panels are not yet wired for datasources in phase 1.
- **i18n**: all user-facing strings in `DatasourceList`, `DatasourceBrowser`, `DatasourceConnectSheet`, the detail tabs, delete-confirm modal, and toast messages go through the `datasources` namespace. A few strings in `DatasourceList`'s table column headers are still literal and tracked as a known deviation in §12.

## 11. i18n

Namespace `datasources` in `apps/web/src/lib/i18n/locales/en/datasources.json`. Key groups (illustrative, not exhaustive):

- `newDatasource`, `new_pageTitle`, `new_pageSubtitle`, `nameLabel`, `list_title`, `searchPlaceholder`, `browserSearchPlaceholder`, `browserEmptyTitle`, `browserEmptyDescription`, `requestDatasource`, `clearSearch`, `editNameAriaLabel`, `randomizeName`, `confirmName`, `untitled`, `emptyTitle`, `emptySearch`, `emptyDescription`.
- `testConnection`, `testing`, `cancel`, `connect`, `connecting`, `previous`, `next`, `loading`, `notFound`, `notFoundError`, `formNotReady`.
- `connectionTestSuccess`, `connectionTestFailed`, `connectionTestError`, `saveSuccess`, `saveFailed`, `update`, `updating`, `updateSuccess`, `updateFailed`, `delete`, `deleteButton`, `deleting`, `deleteSuccess`, `deleteFailed`, `deleteMissingId`, `deleteConfirmTitle`, `deleteConfirmDescription`.
- `view_pageTitle`, `docsLink`.
- `detail.schema`, `detail.tables`, `detail.settings`.
- `schema.error`, `tables.title`, `tables.error`, `tables.filter.all`, `tables.filter.schema`.
- `card.created`, `card.createdBy`, `card.view`.

New user-facing strings land in this file (plus mirrors in every other locale) per `.claude/rules/i18n.md`.

## 12. Known deviations from the current rules

These are documented here so future work has a known-and-agreed baseline to reconcile, not so they get fixed as part of phase 1. Each is phase-2 material unless a specific amendment says otherwise.

- **Duplicate service hierarchy.** Two directories exist in parallel: `packages/domain/src/services/datasources/` and `packages/domain/src/usecases/datasources/`. The canonical, wired-up hierarchy is `services/datasources/` — both `shell-runtime` and the server routes import from `@qlm/domain/services`. The `usecases/datasources/` directory is historical and intended for removal in phase 2.
- **Plaintext secrets in `datasource_config`.** `IDatasourceRepository.revealSecrets` is a pass-through. Adopting `ISecretVault` is the phase-2 milestone; it will require a driver-schema annotation for secret fields, a server-side split of `config` into non-secret-and-stored vs. secret-and-vaulted, and a one-shot migration of existing rows.
- **Entity ↔ DB drift on visibility.** The entity exposes only `isPublic`; the DB has `is_private` and `is_public`. RLS treats organisational, private, and public as three distinct postures, but the entity cannot describe the "private" posture. Phase 2 adds `isPrivate` to the entity, or collapses to a `visibility: 'organisational' | 'private' | 'public'` enum with a migration.
- **Hand-maintained driver loader array.** `packages/extensions-loader/src/index.ts` hard-codes the `EXTENSIONS` list. Replacing it with Vite-glob discovery (matching `apps/web/src/shell/app-registry.ts`) is phase 2.
- **Supabase adapter `creatorName` side effect.** `SupabaseDatasourceRepository` injects a `creatorName` field into returned rows after an RPC or profiles-table lookup. The field is not declared on the port contract and not on the entity schema. Phase 2 either promotes it to a first-class `findWithCreator` port method or drops it in favour of a separate user-lookup query.
- **No persisted test status.** The UI shows the latest test result in-session only; refreshing the page forgets it. Phase 2 adds `test_status`, `test_error`, `tested_at` columns and persists the result of the most recent `testConnection` call.
- **No test coverage for datasource services or routes.** Phase 2 adds domain-service tests (happy path + error branches), server-route tests (happy path + validation errors), and at least one shell-runtime integration test.
- **A handful of literal strings in feature components.** A small number of column headers in `DatasourceList` are still literal. Phase 2 routes them through the `datasources` namespace.
- **No dedicated rate limit on `/datasources/:id/test`.** The feature relies on the generic `/driver/command` rate limiter. Phase 2 adds a dedicated per-user rate limit for test-connection as the credential-probing surface hardens.

None of the above block phase 1 from being accepted. They are the written-down lineage for phase 2 to act against.

## 13. Rollout plan

| Phase | Scope                                                                                                                                     | Artifacts                                                     | Status  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------- |
| 1     | Datasource primitive end-to-end as documented in §3.1 and §10: CRUD, shell resource, plugin app, 14 driver packages, browser / node dispatch, RLS, i18n. | This RFC + [phase-1 spec](../specs/0006-datasources-phase1.md) | Shipped |
| 2     | Reconciliation phase: vault-backed secrets, entity ↔ DB alignment, canonical services cleanup, declarative driver discovery, persisted test status, test coverage, i18n audit, literal-string cleanup. Everything in §12. | Phase 2 RFC                                                   | Future  |
| 3     | **Driver breadth**: the long-tail driver families (Azure SQL, BigQuery, Snowflake, Redis, Elasticsearch, Kafka, …) as package drops against the phase-1 contract. **Remix flow** UI for public datasources. | Phase 3 RFC                                                   | Future  |
| 4     | **Federated multi-source query rework**: the query-engine attach surface gets redesigned around how multiple datasources compose, driven by real notebook usage. | Phase 4 RFC                                                   | Future  |
| 5     | **Dataplane-local datasources**: a datasource whose driver runs inside a private node (RFC 0001 phase 2) rather than on the control plane. Blocked on the dataplane node primitive existing. | Phase 5 RFC                                                   | Future  |
| 6     | **Agent-SDK datasource loader**: the agent factory consumes datasources by id with a dedicated auth boundary.                             | Phase 6 RFC                                                   | Future  |
| 7     | **Operational maturity**: credential rotation reminders, audit log, usage analytics, drift detection — if real usage proves any of them necessary. | Maybe-RFC                                                     | Maybe   |

Each phase is an independent RFC. Phase 2 is the reconciliation phase — it is the first place any of the §12 deviations get fixed, and it is the gate before any new user-visible capability lands.

## 14. Open questions

*None.* Phase 1 is shipped. Every decision this RFC documents has been made. Unresolved design questions for phase 2 belong in the phase 2 RFC, not here.

## 15. Alternatives considered

- **Extend integrations (RFC 0001) to also model datasources.** Rejected. Integrations model a *cloud account* used for provisioning and ingestion. Datasources model a *data source* used for queries. They share only the extensions-SDK pattern; their lifecycles, permissions, and downstream consumers diverge completely. Collapsing them would regress both.
- **Skip the primitive; embed connection strings in notebook cell metadata.** Rejected. Cells become non-shareable, non-auditable, non-rotatable; every other consumer (schema browser, federated query, agent loader) would have to re-solve the same problem. The primitive is the cheap thing; not having it is the expensive thing.
- **Make datasources org-scoped instead of project-scoped.** Deferred, not rejected. Project-scoped is simpler and matches every other primitive in the current repo. An org-owned, project-granted model is a strict extension and is easier to add later than to take away.
- **One monolithic driver per provider (no browser / node split).** Rejected. DuckDB and the file-format providers are natural browser-runtime citizens; Postgres and most network databases are not. Forcing every driver through the server would make browser-local datasets pointlessly slow; forcing every driver through the browser would leak database credentials into the client. The split is essential and is one of the load-bearing parts of the primitive.
- **Single visibility boolean (public vs. not-public).** Rejected. Private exploration datasources and team-shared organisational datasources are distinct use-cases with distinct RLS postures; collapsing them into a single "not public" bucket would mean either every datasource is visible to the whole org (wrong for exploration) or every datasource is creator-only (wrong for teams).
- **Vault-backed secrets in phase 1.** Considered, deferred to phase 2. The feature was prioritised behind getting the primitive and the driver set end-to-end; vault adoption would have added cross-cutting schema-annotation work that was not on the critical path for unblocking downstream consumers (notebooks, query engine).
- **Declarative driver discovery in phase 1.** Considered, deferred to phase 2. Shipping 14 drivers against a hand-maintained list was faster than designing the Vite-glob + contributes walk for the initial commit; the deviation is documented in §12 for phase 2 to reconcile.

## 16. References

- `.claude/rules/spec-driven-dev.md` — SDD rules this flow follows.
- `.claude/rules/hexagonal-architecture.md` — layering rules this design is measured against.
- `.claude/rules/database.md`, `apps/web/supabase/CLAUDE.md` — RLS, permission enum, and migration conventions.
- `.claude/rules/i18n.md` — string-handling rules.
- `.claude/rules/testing.md` — test-scope conventions.
- `docs/rfcs/0001-integrations.md` — sibling credential primitive; precedent for `ISecretVault` adoption.
- `packages/domain/src/entities/datasource.type.ts` — entity definition.
- `packages/domain/src/repositories/datasource-repository.port.ts` — repository port.
- `packages/domain/src/services/datasources/` — canonical use-case services.
- `packages/repositories/supabase/src/datasource.repository.ts` — Supabase adapter.
- `apps/web/src/lib/repositories/datasource.repository.ts` — HTTP adapter.
- `packages/shell-runtime/src/resources/datasources.ts` — shell runtime resource.
- `apps/server/src/routes/datasources.ts` — Hono routes.
- `packages/apps/datasources/src/manifest.ts`, `plugin-root.tsx` — plugin app.
- `packages/features/datasources/src/components/` — feature components.
- `apps/web/src/shell/driver-dispatch.ts` — browser / node dispatcher.
- `packages/extensions-sdk/src/` — driver plug-in contract.
- `packages/extensions-loader/src/index.ts` — hand-maintained driver loader.
- `apps/web/supabase/schemas/22-datasources.sql` — table definition and RLS policies.
- `apps/web/src/lib/i18n/locales/en/datasources.json` — i18n namespace.

---

## Review checklist for the author

- [ ] Does §1 make the scope obvious in one paragraph, and is the post-hoc-documentation intent explicit?
- [ ] Is every §3.1 goal an observable exit criterion that the current code actually satisfies?
- [ ] Is every §3.2 non-goal pinned to a named future phase?
- [ ] Does §12 capture every known deviation so phase 2 can act against a written baseline?
- [ ] Does §4 distinguish reused prior art from orthogonal prior art?
- [ ] Would a newcomer understand the feature after reading only §1 through §5?
- [ ] Is §14 empty because decisions are made, not because questions were avoided?
- [ ] Does every alternative in §15 have a concrete reason it was not chosen?

---

## Amendments

Per the SDD workflow, the RFC body is immutable after `/rfc-to-spec` runs. Post-spec deviations are recorded here instead of editing the body above.

*(none yet)*
