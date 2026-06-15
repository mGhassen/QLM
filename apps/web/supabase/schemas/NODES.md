# `public.node` — Table Reference

Schema files: `37-platform-nodes.sql` (base), `43-platform-nodes-v2.sql` (v2 additions).

---

## Column map

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK, `uuid_generate_v4()` default |
| `label_name` | `varchar(255)` | Human-readable name (domain field: `name`) |
| `organization_id` | `uuid → organizations` | Org scoping. `NULL` = public shared pool |
| `account_id` | `uuid → accounts` | Legacy column, superseded by `organization_id` |
| `node_type` | `node_type` enum | Pool membership: `'private'` or `'public'` |
| `node_pool` | `varchar` | Pool label (e.g. `'default'`, `'gpu'`, `'staging'`) |
| `datacenter` | `varchar` | Availability zone / datacenter identifier |
| `region` | `varchar` | Cloud region (e.g. `'us-east-1'`, `'eu-west-1'`) |
| `hosting_provider` | `hosting_provider` enum | See enum values below |
| `node_status` | `node_status` enum | Legacy: `'Up'` / `'Down'` — kept for compatibility |
| `lifecycle_status` | `node_lifecycle_status` enum | Canonical status used by domain model |
| `instance_type` | `varchar(64)` | Machine class: `'standard-2'`, `'gpu-8'`, etc. |
| `version` | `int` | Optimistic concurrency counter. Auto-incremented by trigger on every `UPDATE`. |
| `labels` | `jsonb` | Key/value pairs for structured filtering. GIN-indexed. |
| `tags` | `text[]` | Simple string tags (domain compatibility) |
| `ip` | `inet` | Primary IP address |
| `owner` | `varchar(255)` | Optional owner string |
| `availability_zone` | `varchar(64)` | AZ within the region |
| `disk_gb` | `int` | Disk capacity in GB |
| `cpu` | `int` | vCPU count |
| `memory` | `int` | RAM in GB |
| `storage` | `int` | Storage in GB (legacy; prefer `disk_gb`) |
| `metadata` | `jsonb` | Freeform infra metadata — not exposed in domain model |
| `is_deleted` | `boolean` | Soft-delete flag. All reads filter `is_deleted = false`. |
| `is_active` | `boolean` | Whether node is currently accepting workloads |
| `is_default` | `boolean` | Default pool member flag |
| `created_at` / `updated_at` | `timestamptz` | Auto-set by `trigger_set_timestamps()` |
| `created_by` / `updated_by` | `uuid → auth.users` | Auto-set by `trigger_set_user_tracking()` |

---

## Enums

### `node_lifecycle_status` (canonical — used by domain)
| Value | Meaning |
|-------|---------|
| `provisioning` | Being spun up |
| `running` | Healthy, accepting workloads |
| `draining` | Draining existing workloads before stop |
| `stopped` | Halted, no workloads |
| `terminating` | Being destroyed |
| `error` | Unhealthy / failed state |

### `node_status` (legacy — `'Up'` / `'Down'`)
Still present on the row. Repository adapter maps: `Up → running`, `Down → stopped`. Do not write new code against this column — use `lifecycle_status`.

### `node_type` — pool membership
`'private'` = org-owned pool. `'public'` = shared platform pool (no `organization_id`).

### `hosting_provider`
`'AWS'` · `'Azure'` · `'GCP'` · `'DigitalOcean'` · `'Linode'` · `'Vultr'` · `'On-premise'` · `'Other'`

Domain model maps to lowercase: `aws`, `gcp`, `azure`, `on-premise`. Adapter handles the case conversion.

---

## `public.node_runtime_state` — fast-changing observability

| Column | Type | Notes |
|--------|------|-------|
| `node_id` | `uuid` PK → `node` | One row per node |
| `health` | `node_health` enum | `healthy / warning / critical / offline / unknown` |
| `cpu_util_pct` | `numeric(5,2)` | 0–100 |
| `mem_util_pct` | `numeric(5,2)` | 0–100 |
| `disk_util_pct` | `numeric(5,2)` | 0–100 |
| `last_seen_at` | `timestamptz` | Last heartbeat from infra plane |
| `updated_at` | `timestamptz` | Auto-set |

**Why separate?** Hot writes from the infra plane would increment `version` on the node row and cause spurious optimistic concurrency conflicts for user mutations. Runtime state is written only by the infra daemon — never by user-facing mutations.

---

## RLS

| Table | Principals | Rule |
|-------|-----------|------|
| `node` | `authenticated` (SELECT only) | `is_deleted = false` AND (`organization_id IS NULL AND node_type = 'public'`) OR (org member via `has_role_on_organization(organization_id)`) |
| `node` | `service_role` | Full access (infra plane, server routes) |
| `node_runtime_state` | `authenticated` (SELECT only) | JOIN to `node` — inherits same org-scope check |
| `node_runtime_state` | `service_role` | Full access |

No `INSERT`/`UPDATE`/`DELETE` policies for `authenticated` — all writes are ops-managed via `service_role`.

---

## Indexes

| Name | Columns | Purpose |
|------|---------|---------|
| `idx_node_org_deleted` | `(organization_id, is_deleted)` | List-page primary filter |
| `idx_node_provider_region` | `(hosting_provider, region)` | Facet/filter queries |
| `idx_node_pool` | `(node_pool)` | Pool filter |
| `idx_node_lifecycle_status` | `(lifecycle_status)` | Status filter |
| `idx_node_labels` | `labels` GIN | Label/tag search |
| `unique_shared_node` | `(id)` WHERE `account_id IS NULL` | Shared-pool uniqueness |
| `unique_account_node` | `(account_id, id)` WHERE `account_id IS NOT NULL` | Per-account uniqueness |

---

## Triggers

| Trigger | Event | Function | Effect |
|---------|-------|----------|--------|
| `set_node_timestamps` | BEFORE INSERT OR UPDATE | `trigger_set_timestamps()` | Auto-sets `created_at`, `updated_at` |
| `set_node_user_tracking` | BEFORE INSERT OR UPDATE | `trigger_set_user_tracking()` | Auto-sets `created_by`, `updated_by` |
| `increment_node_version` | BEFORE UPDATE | `trigger_increment_version()` | `version = OLD.version + 1` — powers optimistic concurrency in the repository adapter |

---

## Domain ↔ SQL field mapping

| Domain entity field | SQL column | Notes |
|--------------------|-----------|-------|
| `name` | `label_name` | Renamed in SQL |
| `organizationId` | `organization_id` | Org-scoped (replaces legacy `account_id`) |
| `status` (domain) | `lifecycle_status` | New enum. `node_status` is legacy. |
| `kind` | `instance_type` | `'standard-2'`, `'gpu-8'`, etc. |
| `provider` | `hosting_provider` | Case-normalized in adapter |
| `tags` | `tags` | Direct `text[]` |
| `version` | `version` | Auto-incremented by trigger |
| `healthState` | `node_runtime_state.health` | JOIN from runtime table |
| `cpuUtilPct` | `node_runtime_state.cpu_util_pct` | JOIN from runtime table |
| `memUtilPct` | `node_runtime_state.mem_util_pct` | JOIN from runtime table |
| `lastSeenAt` | `node_runtime_state.last_seen_at` | JOIN from runtime table |
| `cluster` | `node_pool` | Renamed in SQL |

---

## Gotchas

- **Soft delete everywhere.** Never `DELETE FROM public.node`. Set `is_deleted = true`. All RLS policies + repository queries filter this out.
- **`version` is trigger-managed.** Don't set it manually on `UPDATE` — the trigger overwrites it. On `INSERT`, `DEFAULT 1` applies.
- **Two status columns.** `node_status` (`Up`/`Down`) is legacy and should be ignored in new code. `lifecycle_status` is canonical.
- **`organization_id` vs `account_id`.** `account_id` is the original FK to `accounts`. `organization_id` is the v2 FK to `organizations`. Both may be non-null on newer rows; old rows only have `account_id`.
- **Writes require `service_role`.** There are no `INSERT`/`UPDATE`/`DELETE` policies for `authenticated`. All user-initiated mutations go through the Hono server (service role key).
- **`labels` (jsonb) vs `tags` (text[]).** `labels` is for structured key/value filtering with GIN index. `tags` is a simpler array kept for domain model compatibility.
