# RFC 0001 — Integrations (AWS + GCP, phase 1)

| Field      | Value                                                |
| ---------- | ---------------------------------------------------- |
| Status     | Accepted — phase 1 shipped 2026-04-11                |
| Author     | Hani Chalouati                                       |
| Created    | 2026-04-11                                           |
| Target     | Phase 1 (AWS + GCP, CRUD + test)                     |
| Supersedes | —                                                    |
| Related    | [RFC 0005 — Contextual help panels](./0005-contextual-help-panels.md) (consumed by integrations in phase 1) |

## 1. Summary

Introduce **Integrations** — a project-scoped primitive that holds a user's credentials to a third-party cloud (AWS, GCP first; later Supabase, Neon, Azure, …) and exposes a small, growing driver surface through which Guepard performs cloud-side operations on the user's behalf.

Integrations are the credential and permission boundary that unlocks Guepard's two defining capabilities against the user's own infrastructure:

1. **Dataplane private nodes** — provision Guepard compute inside the user's cloud account so that git-like databases and query execution live next to (and inside the network of) the user's data, with no egress out of their VPC.
2. **Cloud database ingestion** — discover the user's existing managed databases (RDS, Cloud SQL, Aurora snapshots, …) and pull them into Guepard as git-like databases: the first ingest becomes the root commit, subsequent ingests become branches or new commits.

Phase 1 deliberately ships the smallest slice that proves the abstraction end-to-end: CRUD on the integration primitive, encrypted credential storage via the existing `ISecretVault`, a "test connection" operation, and a "list regions" operation. Dataplane node provisioning and ingestion are explicit non-goals of phase 1 but the driver interface and data model are shaped so that phase 2 adds them without reworking anything beneath the UI.

## 2. Motivation

Guepard is a data platform built around **git-like databases** — databases the user can branch, commit, diff, time-travel, and hand to AI agents — plus query tooling and agent connectivity on top. The versioning layer (GFS) and the git-like database primitives live outside this console today; what the console is missing is the *bridge* between a user's existing cloud infrastructure and that platform.

Concretely, two things the product needs to do that it cannot do today:

1. **Run Guepard inside the user's cloud.** Many prospective users cannot move data across a network boundary for compliance, cost, or latency reasons. Guepard's answer is the **dataplane private node**: a Guepard runtime (compute + storage locally close to the user's databases) provisioned inside the user's own AWS / GCP account and registered with the control plane. The user gets git-like versioning and agent access without ever shipping bytes outside their network. To stand up a private node, Guepard needs credentials on the user's cloud account, region awareness, and the ability to call provisioning APIs. That all starts with the integration primitive.

2. **Ingest an existing cloud database into Guepard.** The value proposition of Guepard ("your Postgres, but with branches") is realised only when a user can point Guepard at their RDS instance or RDS snapshot and say *"make this a git-like database"*. The ingestion flow — discover RDS instances, pick one, snapshot it, pull the snapshot into the dataplane, register it as a git-like database rooted at commit zero — all depends on Guepard having credentials and cloud-API reach into the user's account. That, again, starts with the integration primitive.

A secondary, but important, consequence: **AI agents query databases, not clouds**. Agents in `packages/agent-factory-sdk` connect to registered databases in Guepard by id. They do not and should not know about cloud credentials. Integrations are the upstream primitive that lets "a cloud database" *become* "a Guepard git-like database" that the agent can then use. The agent layer is a consumer of what integrations unlock; it is not a consumer of integrations themselves.

Today, nothing in this repository models credentials against a cloud *account*. The predecessor product (qwery, whose `datasources` and `notebooks` primitives are still in the tree) modelled "a connection to a single database" via its `datasources` table — that is a legitimate primitive for hand-entered connection strings, but it is the wrong shape for holding cloud-account credentials, for running region-listing API calls, for provisioning nodes, or for orchestrating an ingestion pipeline. The two concepts — *"a git-like database"* and *"a cloud account we can talk to"* — are distinct and both need to exist.

This RFC introduces the second one: integrations. It lands only the foundation — the table, the ports, the shell, the plugin app, and the two smallest operations (`test`, `listRegions`) — so that phase 2 can build dataplane provisioning and phase 3 can build ingestion on top without reshaping anything.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- A new **project-scoped** entity: `integration_connection`, carrying `provider`, non-secret `config`, an encrypted credential handle, and a test result. Owned by the project; a project has many integrations (e.g. one for prod AWS, one for staging AWS, one for GCP).
- First-class support for **AWS** and **GCP**.
- A **pluggable provider-driver port**, designed to grow into phase 2/3 operations (provision node, list ingestable databases, snapshot pull) without breaking changes.
- **Encrypted credential storage** via the existing `ISecretVault` port (`packages/domain/src/repositories/secret-vault.port.ts`). Raw secrets never round-trip to the browser after the initial POST that creates them.
- A new plugin app `packages/apps/integrations`, registered automatically by the existing Vite-glob app registry (`apps/web/src/shell/app-registry.ts`).
- Two functional operations, end-to-end through the domain → shell → UI stack:
  1. **Test connection** — credentials are valid against the provider; record the caller identity (AWS caller ARN, GCP service-account email).
  2. **List regions** — which regions those credentials can see; a prerequisite for every phase-2 operation.
- Row-level security on the new table. The RLS shape follows the patterns in `apps/web/supabase/CLAUDE.md` (org-member reads, `integrations.manage` permission for writes).
- A new i18n namespace `integrations` under `packages/i18n/src/locales/*/integrations.json`.

### 3.2 Non-goals (phase 1)

Stated here because the design has to *accommodate* each one in phase 2+ without *committing* to it in phase 1.

- **Dataplane private node provisioning**: no `dataplane_nodes` table, no launch/describe/terminate APIs, no VPC/subnet/AMI selection flow. Phase 2.
- **Cloud database ingestion**: no RDS / Cloud SQL / Aurora discovery, no snapshot pull, no "bootstrap a git-like database from this snapshot" pipeline. Phase 2/3.
- **OIDC / federation**: no STS AssumeRole with external id, no GCP Workload Identity Federation. Phase 1 uses long-lived credentials only. Phase 4.
- **Agent-side cloud awareness**: the agent SDK does not learn about integrations. Agents continue to consume git-like databases by id, and integrations remain invisible to them.
- **Audit log** / rotation / expiry / cross-project sharing: future.

## 4. Prior art in the codebase

Relevant existing pieces that shape this design. It is important to be clear which are legacy qwery primitives, which are still core to Guepard, and which are orthogonal.

- **`datasources`** (`packages/domain/src/entities/datasource.type.ts`, `apps/web/supabase/schemas/22-datasources.sql`) — a **qwery-era primitive**, still in the tree, modelling "a connection to a single database" with a `provider` / `driver` / `kind` + a `jsonb` config blob. We do **not** extend or reuse this for integrations. We do lift the *RLS policy shape* from `22-datasources.sql` because it is the cleanest example of project-scoped RLS with the `has_role_on_organization` / `has_permission` helpers in this repo — the policies themselves, not the concept.
- **`ISecretVault`** (`packages/domain/src/repositories/secret-vault.port.ts`) — already-existing port with `protect(value, { keyName, datasourceId? }) → protected handle`, `reveal(protected) → raw`, `isProtected(value) → boolean`. Reused as-is. Open question §13.1 addresses whether the current implementation copes with ~2 KB opaque JSON blobs (GCP service-account JSON) and whether it supports forget-on-delete.
- **`packages/agent-factory-sdk`** — LLM tooling + a DuckDB query engine. `datasource-loader.ts` loads registered databases by id and is the *consumer* of whatever integrations end up ingesting, not a consumer of integrations themselves. Integrations are deliberately invisible to this layer.
- **GFS (git-like file/database layer)** — the versioning substrate referenced by the `mcp__gfs__*` tools in the environment. GFS is not imported by this console today; the expectation is that once phase 3 ingestion lands, an ingested snapshot becomes the root commit of a GFS-backed git-like database. GFS is orthogonal to integrations — one is *versioning*, the other is *sourcing*. They meet at the ingestion boundary and nowhere else.
- **App discovery** (`apps/web/src/shell/app-registry.ts`) — the Vite-glob registry that auto-discovers `packages/apps/*/src/manifest.ts`. Adding `packages/apps/integrations` is zero-config.
- **Shell runtime resources** (`packages/shell-runtime/src/resources/*.ts`) — the pattern for exposing a domain capability through `useShell()`. `notebooks.ts` and `datasources.ts` are legacy but still the closest structural references for the new `integrations.ts` resource.
- **`packages/extensions-sdk`** — a driver-plugin system scoped to *datasource drivers* (how to talk to a specific database engine). It is the wrong target for cloud-account credentials and cloud APIs; the shape (small typed driver interface + registry) is referenced as prior art, not reused.

## 5. Architecture overview

```
apps/web                                      apps/server
  └─ routes/org/$slug/project/...                └─ routes/integrations.ts
         │  (React UI via plugin app)                │  (Hono routes)
         ▼                                              ▼
  packages/apps/integrations                    domain services
  ├─ manifest.ts                                ├─ CreateIntegrationConnectionService
  ├─ plugin-root.tsx                            ├─ UpdateIntegrationConnectionService
         │                                      ├─ UpdateIntegrationCredentialsService
         ▼                                      ├─ TestIntegrationConnectionService
  shell-runtime                                 └─ ListProviderRegionsService
  └─ resources/integrations.ts                       │
         │                                            ▼
         ▼                                   IIntegrationProviderDriver (port, domain-pure)
  IIntegrationConnectionRepository                   │
  (port in packages/domain)                          ├─ AwsDriver   (server-only)
         │                                           └─ GcpDriver   (server-only)
         ├─ SupabaseIntegrationConnectionRepository          │
         │   (packages/repositories/supabase/...)             ▼
         └─ HttpIntegrationConnectionRepository       provider SDKs
             (apps/web/src/lib/repositories/...)     (@aws-sdk/*, google-auth-library)
                           │
                           ▼
                 public.integration_connections
                 (RLS-protected table in Supabase)

                  ↓   phase 2+   ↓

                 dataplane_nodes table           ingestion pipeline
                 (future RFC)                    (future RFC) — uses the same
                                                  integration credentials to
                                                  list RDS, pull snapshots,
                                                  and bootstrap a git-like db
```

Two orthogonal ports:

- **Persistence** — `IIntegrationConnectionRepository`, implemented once against Supabase and once against the HTTP API, exactly like every other entity in the codebase.
- **Provider driver** — `IIntegrationProviderDriver`, implemented once per cloud. These drivers run **only on the server** (they import provider SDKs and handle revealed credentials).

The browser-side UI never touches a provider SDK and never sees raw secrets past the initial POST. The agent SDK never touches integrations at all — it continues to consume databases by id, and phase 3's ingestion pipeline is what connects the two.

## 6. Data model

One new table, one new numbered schema file. File name picked when the spec lands — whatever is next in the sequence under `apps/web/supabase/schemas/`.

```sql
create table if not exists public.integration_connections (
  id              uuid primary key default extensions.uuid_generate_v4(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  provider        text not null check (provider in ('aws', 'gcp')),
  name            text not null,
  slug            text not null,
  config          jsonb not null default '{}'::jsonb,      -- non-secret: default_region, account hint, etc.
  secret_ref      text,                                     -- opaque handle returned by ISecretVault.protect()
  test_status     text not null default 'untested'
                    check (test_status in ('untested','success','failed')),
  test_identity   text,                                     -- on success: AWS caller ARN / GCP SA email
  test_error      text,
  tested_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  updated_by      uuid references auth.users(id) on delete set null,
  unique (project_id, slug)
);

alter table public.integration_connections enable row level security;
revoke all on public.integration_connections from authenticated, service_role;
grant select, insert, update, delete on public.integration_connections to authenticated;

-- RLS shape follows apps/web/supabase/CLAUDE.md and mirrors 22-datasources.sql:
-- read  → any member of the project's organisation
-- write → 'integrations.manage' permission on the org, or org owner
create policy "integration_connections_read" on public.integration_connections for select
  to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = integration_connections.project_id
        and public.has_role_on_organization(p.organization_id)
    )
  );

create policy "integration_connections_write" on public.integration_connections for insert
  to authenticated with check (
    created_by = auth.uid() and exists (
      select 1 from public.projects p
      where p.id = integration_connections.project_id
        and (
          public.is_organization_owner(p.organization_id) or
          public.has_permission(auth.uid(), p.organization_id, 'integrations.manage'::app_permissions)
        )
    )
  );
-- analogous update / delete policies in the spec
```

Permission value: add `'integrations.manage'` to the existing `public.app_permissions` enum, per the *"Add permissions (if any)"* pattern in `apps/web/supabase/CLAUDE.md`. Open question §13.5 discusses whether to reuse any existing permission instead; the proposal is a new one because integrations are materially different from datasources.

Field contract:

- **Non-secret fields** live in `config`: `default_region`, `account_hint` (AWS account id / GCP project id — surfaced in the UI so users can identify an integration at a glance).
- **Secret fields** never touch `config`. `POST /integrations` takes raw credentials in its body, the server immediately calls `ISecretVault.protect(raw, { keyName: 'integration:<provider>:<id>' })`, and the returned handle is stored in `secret_ref`. Nothing about the secret is otherwise persisted.
- `test_identity` is stored on successful tests so the list view can show "connected as arn:aws:iam::123:user/guepard" or the GCP service-account email without re-hitting the provider.
- `secret_ref` is nullable to leave room for a future "draft" flow (create the integration without credentials, attach them later). Phase 1 always populates it on creation.
- Triggers: `public.trigger_set_timestamps()` and `public.trigger_set_user_tracking()`, per the conventions in `apps/web/supabase/CLAUDE.md`.

Note: no `dataplane_nodes`, no `ingestion_runs`, no `cloud_databases` tables land with this RFC. Each of those is a phase-2+ RFC. This table is the parent row those future tables will reference (`integration_connection_id` FK).

## 7. Provider driver abstraction

Phase 1 defines a tiny port and commits to it growing in phases 2/3. The shape below shows phase-1 methods in the interface and phase-2/3 methods commented out so the growth path is visible on day one.

```ts
// packages/domain/src/services/integration/provider-driver.port.ts
export type SupportedProvider = 'aws' | 'gcp';

export type RevealedCredentials =
  | { provider: 'aws'; accessKeyId: string; secretAccessKey: string; sessionToken?: string; defaultRegion: string }
  | { provider: 'gcp'; serviceAccountJson: string; defaultRegion: string; projectId: string };

export interface TestResult {
  ok: boolean;
  identity?: string;   // AWS caller ARN / GCP SA email on success
  errorCode?: 'invalid_credentials' | 'network' | 'permission_denied' | 'unknown';
  errorMessage?: string;
}

export interface Region {
  id: string;      // e.g. "us-east-1", "europe-west1"
  name: string;    // human-readable
}

export interface IIntegrationProviderDriver {
  readonly provider: SupportedProvider;

  // ── phase 1 ────────────────────────────────────────────────────────────────
  testConnection(creds: RevealedCredentials): Promise<TestResult>;
  listRegions(creds: RevealedCredentials): Promise<Region[]>;

  // ── phase 2: dataplane node provisioning ───────────────────────────────────
  // listNodeInstanceTypes?(creds, region): Promise<NodeInstanceType[]>;
  // listVpcsAndSubnets?(creds, region): Promise<NetworkPlacement[]>;
  // provisionDataplaneNode?(creds, spec: DataplaneNodeSpec): Promise<DataplaneNode>;
  // describeDataplaneNode?(creds, nodeId): Promise<DataplaneNodeStatus>;
  // terminateDataplaneNode?(creds, nodeId): Promise<void>;

  // ── phase 2/3: cloud database ingestion ────────────────────────────────────
  // listIngestableDatabases?(creds, region): Promise<CloudDatabase[]>;       // RDS / Cloud SQL / Aurora / ...
  // listDatabaseSnapshots?(creds, region, databaseId): Promise<CloudSnapshot[]>;
  // beginSnapshotPull?(creds, snapshot, targetNode): Promise<PullHandle>;    // hands off to the ingestion pipeline
}
```

- `IIntegrationProviderDriver` lives in `packages/domain`. Pure TypeScript, zero runtime deps.
- Concrete drivers live in a new server-only package (proposal: `packages/integrations-drivers/`). AWS uses `@aws-sdk/client-sts` (`GetCallerIdentityCommand`) + `@aws-sdk/client-ec2` (`DescribeRegionsCommand`) for phase 1; phase 2 adds `@aws-sdk/client-rds`, `@aws-sdk/client-ec2` for EC2, and so on. GCP uses `google-auth-library` plus REST calls to `compute.googleapis.com` / `sqladmin.googleapis.com`.
- A `ProviderDriverRegistry` in the same package resolves drivers by `provider`. Domain services take the registry via constructor injection, exactly like any other port.
- **Hard rule**: driver code only runs inside `apps/server`. Nothing under `apps/web`, `packages/features/*`, or `packages/apps/*` imports the drivers package. The HTTP repository calls `/integrations/:id/test` and `/integrations/:id/regions`; that is the only path.

The commented phase-2/3 methods are not a commitment — they are a sketch so the shape of the interface does not get designed into a corner in phase 1. Phase 2's RFC will refine them (for instance, `DataplaneNodeSpec` may end up split into AWS-specific and GCP-specific subtypes).

## 8. Domain layer additions

All of the following go under `packages/domain/src/`:

- `entities/integration-connection.type.ts` — Zod schema + `IntegrationConnectionEntity.create/.update` factories, matching the existing entity pattern.
- `repositories/integration-connection-repository.port.ts` — `abstract class IIntegrationConnectionRepository extends RepositoryPort<IntegrationConnection, string>` with:
  - `findByProjectId(projectId): Promise<IntegrationConnection[]>`
  - `findBySlugInProject(projectId, slug): Promise<IntegrationConnection | null>`
  - `updateTestResult(id, { status, identity?, error?, testedAt })`
- `services/integration/`
  - `create-integration-connection.usecase.ts` — validates input, generates slug, encrypts credentials via injected `ISecretVault`, persists row.
  - `update-integration-connection.usecase.ts` — updates non-secret fields only.
  - `update-integration-credentials.usecase.ts` — dedicated path for rotating credentials; re-`protect()`s and replaces `secret_ref`.
  - `test-integration-connection.usecase.ts` — fetches row, reveals credentials, calls `driver.testConnection`, persists the result (including `test_identity`).
  - `list-provider-regions.usecase.ts` — fetches row, reveals credentials, calls `driver.listRegions`. Regions are **not persisted**; they are always fetched live so stale data cannot mislead UI.
  - `delete-integration-connection.usecase.ts` — deletes the row; tells the vault to forget the secret if the vault supports it (see §13.1).
- `usecases/dto/integration-usecase-dto.ts` — `CreateIntegrationConnectionInput`, `UpdateIntegrationConnectionInput`, `UpdateIntegrationCredentialsInput`, `IntegrationConnectionOutput`. `class-transformer` `@Expose`/`@Exclude` ensure `secret_ref` and any secret fields never serialise back to the browser.

Nothing in `packages/domain` imports an AWS or GCP SDK. The driver interface is the only seam.

## 9. Adapters, shell resource, and server routes

- **Supabase adapter**: `packages/repositories/supabase/src/integration-connection.repository.ts` — implements `IIntegrationConnectionRepository` using `supabase.from('integration_connections')`. Snake ↔ camel serialisation per the existing pattern.
- **HTTP adapter**: `apps/web/src/lib/repositories/integration-connection.repository.ts` — implements the same port on top of the `apiGet/Post/Patch/Delete` helpers, calling `/integrations/*`. Phase 1 is **HTTP-only** for writes (so secrets cannot leak through the browser Supabase client). Reads could go direct-to-Supabase via RLS; §13.6 defers that call to the spec.
- **Factory wiring**: `apps/web/src/lib/repositories-factory.ts` adds the new repository. The abstract `Repositories` interface in `packages/domain/src/repositories/repositories.ts` grows a new field.
- **Shell resource**: `packages/shell-runtime/src/resources/integrations.ts` exposing:
  ```ts
  shell.integrations.list()
  shell.integrations.get(id)
  shell.integrations.create(input)          // secrets in, sanitised row out
  shell.integrations.update(id, input)      // non-secret fields
  shell.integrations.updateCredentials(id, creds)
  shell.integrations.delete(id)
  shell.integrations.test(id)
  shell.integrations.listRegions(id)
  shell.integrations.invalidate.list() / .detail(id)
  ```
  Added to `ShellClient` in `packages/shell-runtime/src/client.ts`.
- **Server routes**: `apps/server/src/routes/integrations.ts`:
  - `GET /` — list by current project.
  - `POST /` — create; accepts secrets; `ISecretVault.protect()` runs before any response.
  - `GET /:id` — read (no secrets).
  - `PATCH /:id` — update non-secret fields.
  - `PUT /:id/credentials` — dedicated credential rotation.
  - `DELETE /:id` — delete.
  - `POST /:id/test` — rate-limited; see §10.
  - `GET /:id/regions` — live provider call.
  Each handler uses `zValidator('json', schema)`, instantiates the service with `repos.integrationConnection` + the driver registry, and wraps errors via `handleDomainException`.

## 10. Security considerations

- **RLS** on the new table, shape taken from `22-datasources.sql`. Read = org member; write/delete = `integrations.manage` or org owner.
- **Secret isolation**: raw credentials never land in `config`, never serialise back to the browser, never appear in logs. The DTO does not expose `secret_ref`. Server-side logging middleware must include the integration-credential field names in its redaction list.
- **Vault boundary**: secrets are only revealed inside server-side use-cases that immediately pass them to a provider driver, and are never logged, never returned, never handed to anything else.
- **Credential probing via `POST /:id/test`**: rate-limit to N requests per minute per user (proposal: 10/min). RLS already prevents cross-org access; rate-limiting prevents a stolen session from using `test` as an oracle over many integrations.
- **Egress**: calls from the server reach `sts.amazonaws.com`, `ec2.<region>.amazonaws.com`, `oauth2.googleapis.com`, `compute.googleapis.com`. These must be on the server's outbound allowlist if one exists.
- **Residual threat — server compromise**: a compromised Guepard server with vault decryption access can drain every credential in every project. This is the biggest argument for OIDC federation (phase 4), not a phase-1 mitigation.
- **Destructive operations in phase 1**: none. `test` and `listRegions` are read-only against the provider. When phase 2 introduces `provisionDataplaneNode`, a fresh security review is mandatory — provisioning endpoints must be behind a distinct permission, a confirmation step, and a tighter rate limit.

## 11. i18n

- New namespace `integrations`, files under `packages/i18n/src/locales/*/integrations.json` for every locale already present.
- Example keys (non-exhaustive; the spec defines the full set):
  - `integrations.list.title`, `integrations.list.emptyState.heading`
  - `integrations.create.providerLabel`
  - `integrations.create.aws.accessKeyIdLabel` / `.secretAccessKeyLabel` / `.sessionTokenLabel`
  - `integrations.create.gcp.serviceAccountJsonLabel`
  - `integrations.test.status.success` / `.failed` / `.untested`
  - `integrations.regions.empty`
- No hardcoded strings in JSX, toasts, aria labels, placeholders, or error messages. All user-facing text goes through `t(...)` or `@guepard/ui/trans`, per `.claude/rules/i18n.md`.

## 12. Rollout plan

| Phase | Scope                                                                                                                                      | Artifacts             | Status  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------- |
| 1     | Integration primitive: CRUD, credential encryption, `test`, `listRegions`. AWS + GCP.                                                      | This RFC + [spec](../specs/0001-integrations-phase1.md) | Shipped |
| 2     | **Dataplane private nodes**: `dataplane_nodes` table, node lifecycle (provision / describe / terminate), network placement picker, attach a node to a project so its git-like databases run inside the user's cloud. | Phase 2 RFC            | Future  |
| 3     | **Cloud database ingestion**: discover RDS / Cloud SQL / Aurora, list snapshots, pull a snapshot through a dataplane node, register the result as a git-like database (root commit = the snapshot). | Phase 3 RFC            | Future  |
| 4     | **OIDC federation**: STS AssumeRole with external id; GCP Workload Identity Federation. Deprecate long-lived credentials for new integrations. | Phase 4 RFC            | Future  |
| 5     | **More providers**: Supabase (service role key), Neon (API key), Azure (service principal), each as a new driver implementation.            | Phase 5 RFC            | Future  |
| 6     | **Operational maturity**: org-level sharing, audit log, rotation reminders — if usage proves any of them necessary.                          | Maybe-RFC              | Maybe   |

Each phase is an independent RFC. Phases 2 and 3 will stress the driver interface — expect it to grow meaningfully. Phase 1 deliberately ships with the two smallest methods so the abstraction is cheap to refactor if phase 2's design pressure breaks any assumption we are making today.

## 13. Open questions

These must be resolved before the spec is written.

1. **Vault capacity and deletion.** Does the current `ISecretVault` implementation (whichever concrete is wired in `repositories-factory.ts`) handle ~2 KB opaque JSON blobs (GCP service-account JSON)? Does it support forgetting a secret on integration deletion, or is it append-only? If append-only, we need a "soft-revoke" strategy.
2. **Sidebar bucket.** Phase-1 integrations feel like `ops`, next to the project dashboard. Once phase 2 (dataplane nodes) lands, that could become a new top-level "Infrastructure" bucket that groups integrations + nodes + ingestion runs. The spec makes the phase-1 call with phase-2 IA in mind.
3. **Slug generation.** Autogenerate from `name` with a numeric suffix on collision (the existing pattern), or let the user pick? Proposal: autogen. Spec confirms.
4. **Driver registry location.** Interface belongs in `packages/domain` unambiguously. For the registry: (A) a new server-only package `packages/integrations-drivers` — clean layering, one extra package; (B) inside `apps/server/src/integrations/drivers/` — no new package, but not reusable by a future CLI or worker; (C) rejected: inside `packages/domain` (would pull SDKs into the pure layer). Proposal: **A**.
5. **Permission naming.** New `integrations.manage`, not a reuse of `datasources.manage`. Integrations are not datasources — they unlock infrastructure operations (provisioning, ingestion) that admins may legitimately want to grant separately.
6. **Supabase-vs-HTTP for reads.** Phase-1 writes must be HTTP-only (for secret isolation). Reads could go directly to Supabase via RLS, saving a server hop. Proposal: HTTP-only in phase 1, revisit if read latency actually matters after phase 2 lands and the list view gains more content.
7. **Error taxonomy.** `TestResult.errorCode` is a small closed set in §7. Is that enough, or do we need provider-specific codes surfaced to the UI? Proposal: small closed set in v1, `errorMessage` carries the details, extend in phase 2.
8. **Dataplane node boundary (for phase-2 readiness).** A dataplane node is owned by an integration and references it via FK — but does a node belong to the integration's *project*, or could multiple projects share a node? Phase 2's RFC decides; phase 1's data model does not preclude either.

## 14. Alternatives considered

- **Extend `datasources` to also hold cloud-account credentials.** Rejected. `datasources` is a qwery-era primitive for a single-database connection; overloading it with cloud-account scope, region listing, provisioning, and ingestion orchestration would regress the datasource feature and entangle two very different lifecycles.
- **Model integrations via `packages/extensions-sdk`.** Rejected. The extensions SDK is scoped to *datasource drivers* — query, metadata, test-connection against a database engine. Cloud-account auth, region listing, node provisioning, and snapshot ingestion do not fit that contract, and bending it would make both subsystems worse. The shape is referenced as prior art only.
- **Org-level (not project-level) integrations.** Deferred, not rejected. Project-level is simpler and matches every other primitive in the current repo. Lifting to an org-owned / project-scoped-grant model is a strict extension and is easier to add later than to take away.
- **OIDC federation in phase 1.** Rejected on sequencing grounds. Federation is strictly safer and is on the roadmap (phase 4), but it materially expands v1 scope (trust-policy UI, external-id generation, user-side IAM docs) and delays the primitive that phases 2 and 3 are blocked on.
- **Skip the integration primitive and hardcode a Guepard-owned AWS account for provisioning.** Rejected. It does not solve the core problem: users need nodes running in *their* cloud accounts for compliance and data-locality reasons. A Guepard-owned cloud account is a demo fixture, not the product.

## 15. References

- `.claude/rules/hexagonal-architecture.md` — layering rules this design is measured against.
- `.claude/rules/database.md`, `apps/web/supabase/CLAUDE.md` — RLS, permission enum, and migration conventions.
- `.claude/rules/i18n.md` — string-handling rules.
- `packages/domain/src/repositories/secret-vault.port.ts` — the credential-encryption seam this RFC reuses.
- `apps/web/supabase/schemas/22-datasources.sql` — RLS policy template (the *policy shape* is borrowed; not the datasource concept).
- `apps/web/src/shell/app-registry.ts` — Vite-glob app discovery; auto-picks up `packages/apps/integrations`.
- `packages/shell-runtime/src/resources/notebooks.ts` — structural reference for the new `integrations` resource.
- `packages/apps/notebook/src/manifest.ts`, `plugin-root.tsx` — structural reference for the new plugin app.
- `packages/agent-factory-sdk/src/tools/datasource-loader.ts` — shows that agents consume registered databases by id; integrations are invisible to the agent layer.

---

### Review checklist for the author

- [ ] Does §2 accurately frame integrations as the credential/permission layer that unlocks dataplane nodes and cloud-database ingestion — not as a generic "cloud provider connector"?
- [ ] Does §4 distinguish qwery-era primitives (`datasources`, `notebooks`) from the Guepard primitives (git-like databases, dataplane nodes, ingestion) clearly enough that no reader walks away thinking integrations are a datasource subtype?
- [ ] Is the phase-1 surface (`test` + `listRegions`) the smallest slice that still proves the abstraction end-to-end against a real provider?
- [ ] Do the commented phase-2/3 methods in §7 leave enough room for real node provisioning and real snapshot ingestion without a breaking refactor of the driver interface?
- [ ] Are the eight open questions in §13 genuinely blockers for the spec, or can any be deferred to implementation?
- [ ] Does the rollout plan in §12 match the product team's sequencing for the next two quarters?

---

## Amendments

Per the SDD workflow, the RFC body is immutable after `/rfc-to-spec` runs. Post-spec deviations are recorded here instead of editing the body above.

### A1 — 2026-04-11 — Provider picker switched to 3-col with "coming soon" card

The RFC §UX and spec §3.2 originally showed a 2-column provider picker. After design review, the picker was rewritten as a 3-column grid with a disabled "More providers coming soon" card alongside AWS and GCP, so the visual signals that the provider set is deliberately small in phase 1. No behaviour change — only AWS and GCP are actually clickable.

### A2 — 2026-04-11 — `ISecretVault.forget` landed as a boot-time warn stub

RFC §13.1 flagged this as a real possibility. The concrete `AesGcmSecretVault` implementation is stateless (handles are self-describing `enc:v1:...` strings, nothing is persisted server-side), so `forget()` is a no-op that logs a one-time warning at server boot. `DeleteIntegrationConnectionService` still calls `forget(ref)` through the port, so the contract is honoured — the stub just means deletion drops the row without revoking an external resource. When a persistent vault lands, `forget` becomes a real delete with zero caller-side changes.

### A3 — 2026-04-11 — Integrations list page rebuilt on `EntityListPage`

RFC §UX sketched a bespoke header + grid pair. After design review (consistency with datasources, notebooks, nodes) the list page was rewritten on top of the shared `@guepard/ui/entity-list`'s `EntityListPage` wrapper, which owns search / sort / grid-vs-table toggle. Net effect: one less bespoke header component and consistent UX with every other project-scoped list in the console.

### A4 — 2026-04-11 — `IntegrationDetailSummary` shows a user name, not a UUID

RFC §UX implied `created_by` would surface as the raw uuid. The detail component now accepts an optional `createdByName?: string | null` resolved by the plugin app and displays the resolved display name when available, falling back to the uuid when not. No port or DTO change.

### A5 — 2026-04-11 — Contextual help lives in [RFC 0005](./0005-contextual-help-panels.md), not inside this RFC

During the integrations create-flow implementation it became clear that users needed contextual help about the IAM permissions required by each provider. The first attempt was an inline info box per form. That was the wrong shape: the help should live **in the plugin** (so each app contributes its own pages), **register to the app contract**, and the **existing right-sidebar documentation panel** should auto-open when relevant. That scope is cross-cutting — it modifies the plugin-root contract, the shell-runtime, the UI layout, and the app registry — so it was lifted out of this RFC into its own. Integrations is the **first consumer** of that contract (its AWS / GCP permission pages open automatically when a provider is picked) but the contract itself belongs to the shell.

