# RFC 0030 — Predictions (RELML integration)

| Field      | Value                                                        |
| ---------- | ------------------------------------------------------------ |
| Status     | Draft                                                        |
| Author     | Wael Ben Amara                                               |
| Created    | 2026-05-08                                                   |
| Target     | New `@qlm/app-predictions` shell app — phase 1 ships the per-datasource conversational schema-understanding agent that all later RELML phases build on. |
| Supersedes | —                                                            |
| Related    | RFC 0006 (datasources), RFC 0008 (qwery-agent), RFC 0024 (global shell UI), RFC 0026 (LLM keys management), RFC 0029 (databases app) |

## 1. Summary

The Predictions app brings relational machine learning to the console by integrating **RELML** — a C++/Python library that trains GNN models (HeteroGraphSAGE) over relational schemas and serves inference. RELML's input is a relational schema; its output is a trained model and predictions. Before any of that is useful, the user must **understand and curate the schema** of their datasource: which tables matter, which columns are entities, which are timestamps, how tables join. That understanding is the bedrock every later phase rests on.

This RFC scopes a multi-phase rollout (schema understanding → task spec → training → registry/inference → drift/scaling). Phase 1 ships exactly the bedrock: per-datasource, project-scoped, **versioned schema snapshots** plus a **conversational LLM agent** that lets users explore and reason about a snapshot. Snapshots are immutable, RLS-protected, and pinnable — later phases reference a specific snapshot version when they author task specs and train models, so reproducibility holds even if the live source schema drifts.

Phase 1 ships:

- A new `@qlm/app-predictions` shell app discoverable in the project shell.
- A list view: every datasource in the current project with its latest snapshot status.
- A "Take snapshot" action that calls the existing `IDataSourceDriver.metadata()` and persists the result as an immutable `prediction_schema_snapshots` row.
- A snapshot detail view with a **schema explorer** (read-only navigation of tables, columns, PKs, FK relationships).
- A **conversational LLM agent** (built on `@qlm/agent-factory-sdk`, reusing the `SimpleSchema` bridge) that answers questions about the active snapshot.
- Domain entities, repository ports, Supabase + HTTP adapters, shell-runtime resources, i18n keys, and Storybook stories.

Phase 1 does **not** ship task spec authoring, training, model registry, inference, explanations, or any deterministic schema-analysis layer beyond what `driver.metadata()` already returns.

## 2. Motivation

The console already has datasources, an extensions SDK that exposes `metadata()` on every driver, a `qwery-agent` that talks to user data via natural language, and an `agent-factory-sdk` that abstracts LLM providers. What it does **not** have is a way for users to do predictive ML over their relational data — and that is the most valuable thing we can do once data is connected. RELML gives us a fast, GPU-optional, dependency-light engine for relational predictions; we already have the input plumbing.

Schema understanding is the load-bearing first step. RELML's `TaskSpec` requires the author to declare PK/FK structure, target column, time column, and inference mode. Authoring a task spec without first **internalizing the relational shape** of the data leads to silent leakage (the `is_top3` example in `binary_f1_example.py` has two leakage traps) and useless models. Conversational exploration of a snapshot is the most direct way to give users that internalization without making them read raw `information_schema` output.

Phase 1 also de-risks every later phase by making the schema layer **immutable and versioned**. Training jobs are minutes-to-hours; if they were pinned to "the live schema," any DDL change mid-job would invalidate the model artifact. Pinning to a snapshot version eliminates that class of bug at the data layer.

The dependency direction is upstream-first. This RFC depends on RFC 0006 (datasources) for the underlying connector surface, RFC 0026 (LLM keys management) for the per-org LLM provider that powers the agent, and RFC 0024 (global shell UI) for the app discovery mechanism. It will be depended on, downstream, by all subsequent Predictions phases (task spec authoring, training, registry, inference, drift). No existing RFC is replaced.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

Each goal is an observable exit criterion — phase 1 is done when every bullet is satisfied.

- A user can open the **Predictions** app inside any project shell (`/prj/{slug}/predictions`) and see the list of datasources in that project with snapshot status (none / latest snapshot timestamp).
- A user can trigger **"Take snapshot"** on a datasource and see a new immutable `prediction_schema_snapshots` row created via the server, populated from `IDataSourceDriver.metadata()`.
- A user can open a snapshot and see a **schema explorer** that lists tables with columns, primary keys, and foreign-key relationships (no editing, no deterministic analysis layer beyond what the driver returns).
- A user can open a **conversational chat panel** scoped to a single snapshot and ask natural-language questions about the schema (e.g. "what tables join through `driverId`?"); the agent answers using the snapshot as context, via `@qlm/agent-factory-sdk`.
- All snapshot data is **RLS-protected** by `project_id` and read/write policies use the existing `has_role_on_organization` / `has_permission` helpers; no `SECURITY DEFINER` without an auth check.
- All user-facing strings flow through `t()` / `@qlm/ui/trans`; no hardcoded English.
- Every UI surface ships a **Storybook story** matching the industrial design system (`rounded-none`, `border-2`, `font-black uppercase tracking-widest` for operational text).
- `pnpm typecheck && pnpm lint && pnpm test` all pass on the phase-1 branch.

### 3.2 Non-goals (phase 1)

Each is pinned to a named future phase.

- **Deterministic schema analysis** (cardinality counts, time-column inference, PK/FK detection beyond what `driver.metadata()` returns). Phase 2.
- **Schema correction / overrides** (user-edited PK/FK declarations to fix what the driver missed). Phase 2.
- **Agent tool-calling and live data sampling** (typed tools, `sample_rows`, etc.). Revisit at phase 3 when the TaskSpec authoring UI may genuinely benefit from typed schema queries.
- **TaskSpec authoring UI** (target column, label transform, split strategy, inference mode). Phase 3.
- **Training jobs and orchestration** (job queue, status, logs, GPU compute). Phase 4.
- **Model registry, artifact storage, versioning**. Phase 5.
- **Inference UI and predictions storage**. Phase 5.
- **LIME explanations / interpretability surfaces**. Phase 5.
- **Drift detection, scheduled retraining, model monitoring**. Phase 6.
- **Cross-project or cross-organization snapshots, sharing, marketplace**. Out of scope for the Predictions roadmap as currently scoped; revisit if demand emerges.
- **Editing or deleting individual snapshots** (snapshots are append-only — users can take a new one, never mutate the old). By design, forever.

## 4. Prior art in the codebase

Reused as-is:

- **`IDataSourceDriver.metadata()`** ([packages/extensions-sdk/src/types.ts:157](packages/extensions-sdk/src/types.ts#L157)) — every existing driver implements this and returns a `DatasourceMetadata` containing schemas, tables, columns, PKs, and FK relationships. Snapshots **call this directly**; no new introspection code.
- **`DatasourceMetadata`** ([packages/domain/src/entities/datasource-meta/metadata.type.ts](packages/domain/src/entities/datasource-meta/metadata.type.ts)) — already-rich Zod-validated shape; the snapshot stores it verbatim.
- **`Table.primary_keys` and `Table.relationships`** ([packages/domain/src/entities/datasource-meta/tables.type.ts](packages/domain/src/entities/datasource-meta/tables.type.ts)) — exactly what RELML needs for FK graph reasoning.
- **`SimpleSchema`** ([packages/domain/src/entities/datasource-meta/simple-schema.type.ts](packages/domain/src/entities/datasource-meta/simple-schema.type.ts)) — lightweight LLM-friendly shape; the conversational agent context-injects this rather than the full `DatasourceMetadata`.
- **`@qlm/agent-factory-sdk`** — provides Claude / Azure OpenAI / Ollama / Bedrock backends via Vercel AI SDK; the conversational agent uses this directly. Same path qwery-agent uses.
- **Project-scoped shell apps** ([packages/apps/notebook](packages/apps/notebook), [packages/apps/datasources](packages/apps/datasources)) — `@qlm/app-predictions` mirrors their structure (manifest + plugin-root, `useShell()` for data access, contextual nav).
- **`useShell()`** ([packages/shell-runtime](packages/shell-runtime)) — apps consume the new `shell.predictions.*` namespace; never instantiate domain services directly.
- **Repository factory** ([apps/web/src/lib/repositories-factory.ts](apps/web/src/lib/repositories-factory.ts)) — the host wires the new `IPredictionSchemaSnapshotRepository` adapter.
- **RLS helper functions** ([packages/supabase/CLAUDE.md](packages/supabase/CLAUDE.md), [apps/web/supabase/CLAUDE.md](apps/web/supabase/CLAUDE.md)) — `has_role_on_organization`, `has_permission`, `is_account_owner`. Used in every new policy.

Replaced:

- *None.* This RFC is greenfield in domain terms — no existing primitive is superseded.

Orthogonal (intentionally not touched in phase 1):

- **`qwery-agent`** (RFC 0008) — a different conversational surface oriented at querying data. The Predictions agent is scoped to schema metadata only, not row-level data. Both share the LLM provider plumbing; neither owns the other.
- **`@qlm/notebook`** — separate concern (interactive query authoring); does not gain Predictions affordances.

If RELML had been integratable as a TS library this section would also list the `apps/server` route patterns; that integration is deferred to phase 4 (training).

## 5. Conceptual model

### 5.1 Three primitives, one direction

```
 Datasource  ──snapshot──▶  SchemaSnapshot  ──asks──▶  ConversationalAgent
 (existing)                  (new)                      (new, LLM)
```

- A **Datasource** (existing) is the live, evolving, project-scoped connection.
- A **SchemaSnapshot** is an immutable, versioned, project-scoped frozen copy of `driver.metadata()` taken at a specific point in time. Every snapshot has a monotonically increasing `version` per datasource.
- A **ConversationalAgent** is a stateless function `(snapshot, message_history, user_message) → assistant_message` that runs on the server, calls the org's configured LLM provider (RFC 0026), and uses the snapshot's `SimpleSchema` projection as system context.

A datasource has zero or many snapshots. A snapshot belongs to exactly one datasource. A conversation is scoped to exactly one snapshot — it cannot span snapshots, nor can it modify the snapshot it points at.

### 5.2 Snapshot is immutable, datasource is mutable

The snapshot is the unit of reproducibility. Future phases (TaskSpec, training, inference) will pin themselves to a snapshot version. If the live datasource schema drifts (a column is renamed, a table is dropped), existing models keep working because they read from a snapshot that still describes the world they were trained on. Drift becomes a phase-6 problem of "compare snapshot vN to live" — explicitly not phase 1's job.

Snapshots are append-only at the data layer: no `UPDATE` policy, no `DELETE` policy. To "refresh," users take a new snapshot.

### 5.3 The agent is a UX layer, not a fact source

The agent reads the snapshot, paraphrases the snapshot, reasons over the snapshot. It does not derive new structural facts (no inferred PKs, no inferred cardinality). If users want analytic facts, that's the deterministic-analysis layer in phase 2. This separation matters because LLM-derived structural claims would compromise the reproducibility guarantee of §5.2 — a future TaskSpec must pin to deterministic facts.

The agent is **context-injection only** in phase 1: the snapshot's `SimpleSchema` projection is rendered into the system prompt, the user's message is the only other input, and the assistant's only output is text. No tool calling, no live datasource access, no server-side actions. This bounds the prompt-injection surface to "user can ask the LLM to misread the schema text," which is purely advisory and harmless to system state. Tool-calling and live data sampling are explicit non-goals — see §3.2 — and will be revisited only when a later phase has a concrete need.

### 5.4 Project as the boundary

Every entity is project-scoped. RLS policies key on `project_id`. Cross-project access is a non-goal; users wanting to share a snapshot copy it through normal data-export channels (out of scope for this RFC). Org-level helpers (`has_role_on_organization`, `has_permission`) are used because the project-to-org relationship is canonical in this codebase.

## 6. Architecture overview

```
   apps/web                                    apps/server (Hono)
   ─────────                                   ─────────────────
   /prj/{slug}/predictions                     POST /predictions/snapshots
       │                                        ├── reads driver.metadata()
       ▼                                        ├── persists row (RLS)
   @qlm/app-predictions                     └── returns snapshot id
       (manifest + plugin-root)                POST /predictions/agent
       │                                        ├── loads snapshot
       │ useShell()                             ├── projects to SimpleSchema
       ▼                                        ├── calls agent-factory-sdk
   shell.predictions.* (shell-runtime)          └── streams response
       │
       ├── HTTP adapter ◀──── apps/web/src/lib/repositories
       └── Supabase adapter ◀── packages/repositories/supabase

   packages/domain (pure)
   ──────────────────────
   entities:    PredictionSchemaSnapshot, AgentConversation, AgentMessage
   ports:       IPredictionSchemaSnapshotRepository, IAgentConversationRepository
   services:    TakeSnapshotService, AskSchemaAgentService
   DTOs/IO:     CreateSnapshotInput, AskAgentInput, AgentMessageOutput
   exceptions:  SnapshotNotFoundException, AgentProviderUnavailableException
```

The split between Supabase adapter (CRUD on snapshots) and HTTP adapter (calls the server, which holds the LLM key and the driver instances) is deliberate: `driver.metadata()` and LLM calls cannot run in the browser, so those operations route through Hono. Snapshot reads (after creation) are direct Supabase to keep listing fast and RLS-checked at the data layer.

## 7. Data model (conceptual)

Phase-1 tables — full DDL goes in the spec, not here.

- **`prediction_schema_snapshots`**
  - `id` (uuid, pk)
  - `datasource_id` (fk → `datasources.id`, on-delete restrict)
  - `project_id` (fk → `projects.id`, RLS key)
  - `version` (int, monotonically increasing per `datasource_id`)
  - `metadata` (jsonb, `DatasourceMetadata` shape, validated by domain Zod; **5 MB hard cap** enforced server-side; UI warns at 1 MB)
  - `taken_by` (fk → `auth.users.id`)
  - `taken_at` (timestamptz, default `now()`)
  - **RLS**: SELECT to org members with `datasources.read`; INSERT gated by the same `datasources.read` (snapshots add no capability beyond what the user can already see in the source); **no UPDATE, no DELETE policies**.

- **`prediction_agent_conversations`**
  - `id` (uuid, pk)
  - `snapshot_id` (fk → `prediction_schema_snapshots.id`)
  - `project_id` (RLS key)
  - `created_by`, `created_at`, `updated_at`
  - **RLS**: members read their org's conversations; only `created_by` can insert/update.

- **`prediction_agent_messages`**
  - `id` (uuid, pk)
  - `conversation_id` (fk)
  - `role` (enum: `user`, `assistant`, `system`)
  - `content` (text)
  - `created_at`
  - **RLS**: read-follows-conversation; insert by conversation owner.

**No new permission is added.** Snapshot creation is gated by the existing `datasources.read` permission — the principle being that a snapshot exposes nothing beyond what the user can already inspect on the live datasource. Future phases (training, inference) will introduce their own permissions when capability genuinely grows; phase 1 stays minimal.

## 8. Interface contracts

### Domain ports

- `IPredictionSchemaSnapshotRepository.create(snapshot)` → `PredictionSchemaSnapshot`
- `IPredictionSchemaSnapshotRepository.listByDatasource(datasourceId)` → `PredictionSchemaSnapshot[]`
- `IPredictionSchemaSnapshotRepository.findLatestByDatasource(datasourceId)` → `PredictionSchemaSnapshot | null`
- `IPredictionSchemaSnapshotRepository.findById(id)` → `PredictionSchemaSnapshot`
- `IAgentConversationRepository.create(...)`, `.appendMessage(...)`, `.listMessages(...)`, `.findById(...)`

### Server routes (Hono)

- `POST /api/predictions/datasources/:id/snapshots` — calls `driver.metadata()` then `TakeSnapshotService.execute(...)`.
- `GET  /api/predictions/snapshots/:id` — proxy that adds project-scope checks.
- `POST /api/predictions/conversations` — create, scoped to a snapshot.
- `POST /api/predictions/conversations/:id/messages` — streams via Server-Sent Events; routes through `agent-factory-sdk`.

### Shell-runtime resource

```
shell.predictions = {
  snapshots: { list, latest, take, get },
  conversations: { create, send, history, invalidate },
}
```

Apps never touch repositories directly. The shell client wires HTTP for `take` / `send`, Supabase for `list` / `history`.

## 9. Security and trust boundaries

- **Authn/authz**: every route requires an authenticated session; project membership is checked via existing helpers; the snapshot create route reuses `datasources.read` (no new permission).
- **RLS**: enabled on every new table at table-creation time. Policies are explicit per operation. Service-role is never used in user-facing requests.
- **Snapshot content**: `DatasourceMetadata` may contain table/column names that are themselves sensitive (e.g. `customer_ssn`). Snapshots inherit the RLS scope of their `project_id` — same trust boundary as the underlying datasource.
- **LLM trust**: snapshot content is sent to the org's configured LLM provider (RFC 0026). The agent's system prompt instructs the LLM **not** to invent structural facts (PKs/FKs not in the snapshot). The user is still the source of truth — agent answers are advisory.
- **Audit events**: `predictions.snapshot.taken`, `predictions.conversation.created`, `predictions.conversation.message_sent`. Audit writes happen before the mutation; failures fail the mutation (per `@.claude/rules/security.md`).
- **No PII in logs**: messages may contain user-typed PII; redact `content` on log emission.
- **Rate limit**: per-user-per-conversation rate limit on `/messages`; per-user-per-datasource rate limit on snapshots (snapshots are not free — they call the live driver).
- **SOC 2 ties**: `CC6.1` (logical access — RLS), `CC7.2` (monitoring — audit log), `CC8.1` (change management — append-only snapshots). Cited for traceability; control evidence lives in Vanta.

## 10. UX surface and product integration

- **Entry point**: project shell sidebar gains a "Predictions" item. Route base: `/prj/{slug}/predictions`.
- **List view**: `EntityListPage`-style grid (or table) of datasources in the current project. Each card shows: provider badge, name, snapshot status (none / N snapshots / latest at *time*), primary action "Take snapshot" or "Open snapshot".
- **Snapshot detail view**: right-side `Sheet` (480px) anchored to a card click. Hero shows datasource identity + snapshot metadata. Body shows tables list, table → columns drilldown, FK relationships rendered as data rows, all using design-system recipes from §6 of the design rules.
- **Agent panel**: a second tab inside the snapshot sheet, or a sibling drawer. Streaming chat UI with message list + composer. Reuses notebook chat patterns where possible.
- **Empty states**: industrial-style `Empty` block with a primary "Take snapshot" CTA and a secondary docs link.
- **Error states**: destructive-tinted bordered card with retry; specific message for "datasource is unreachable" vs "no LLM key configured."
- **Storybook**: every new component has at least one story; stories live in the package that owns the component.

## 11. Operational considerations

- **Observability**: `predictions.snapshot.duration_ms`, `predictions.agent.tokens_in/out`, `predictions.agent.latency_ms` exported via OpenTelemetry (existing `@qlm/telemetry`). Errors logged with `correlation_id`.
- **Rollback**: phase 1 is purely additive. No existing tables touched. Rollback = drop the new tables + remove the app entry; no data migration required.
- **Billing/credits**: agent usage consumes the org's LLM budget (RFC 0026 owns enforcement); no new billing surface in phase 1.
- **Storage**: snapshots are jsonb; expected size 10 KB – 1 MB. No new buckets needed.
- **Performance**: snapshot creation is bounded by the underlying driver's `metadata()` (typically 100ms–5s); agent message latency is provider-bounded.

## 12. Rollout plan

| Phase | Scope                                                                                                                           | Artifacts                  | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------ |
| 1     | Versioned snapshots + conversational agent UI inside `@qlm/app-predictions`. Read-only schema explorer over snapshot.        | This RFC + phase-1 spec    | Draft  |
| 2     | Deterministic schema-analysis layer: cardinality, time-column inference, PK/FK refinement for schemaless sources, user-editable schema overrides on top of an immutable snapshot. | Phase 2 RFC                | Future |
| 3     | TaskSpec authoring UI: target column, label transform, split strategy, inference mode, dataset_schema declaration.               | Phase 3 RFC                | Future |
| 4     | Training orchestration: Python sidecar service running RELML, async job queue, status streaming, training logs, CPU-only first.  | Phase 4 RFC                | Future |
| 5     | Model registry, artifact storage, inference UI (single-row + batch), LIME explanations.                                          | Phase 5 RFC                | Future |
| 6     | Drift detection, scheduled retraining, GPU compute targets, monitoring dashboards.                                               | Phase 6 RFC                | Future |

## 13. Open questions

1. **Where does the LLM call happen — Hono server, edge function, or desktop sidecar?** Phase-1 server placement is the default but RFC 0026 may have a preferred locus we should align to. *Proposal*: server-side via `agent-factory-sdk`, mirroring `qwery-agent`. To resolve in spec drafting if RFC 0026 cutover changes the picture.
2. **Streaming protocol for the agent — SSE or WebSocket?** Both work; SSE is simpler and matches existing patterns. *Proposal*: SSE.
3. **Conversation retention / lifecycle.** Are conversations forever, or do we GC after N days? *Proposal*: keep forever in phase 1; revisit at phase 5 when storage becomes load-bearing.
4. **Per-snapshot or per-datasource agent context.** Phase-1 design pins each conversation to one snapshot; should we also offer "ask across all snapshots of a datasource"? *Proposal*: single snapshot only in phase 1; cross-snapshot is out of scope until phase 6 (drift) needs it.
5. **System-prompt injection guardrails.** User-typed messages contain potentially adversarial content; the agent must refuse to engage with non-schema topics or pretend to take actions. *Proposal*: structured system prompt that scopes the assistant strictly to snapshot Q&A; tool use stays disabled (decided in §5.3); the resolved size cap below means the snapshot context fits easily inside provider limits.

## 14. Alternatives considered

- **Always-live, no persistence (re-call `driver.metadata()` per render).** Rejected. Blocks reproducibility for later phases; adds avoidable latency; degrades to "expensive HTTP cache." Snapshots are cheap and the right primitive long-term.
- **Auto-snapshot on schema drift.** Deferred. Drift detection isn't trivial (requires metadata diff + provider-specific normalization); adds ops complexity not justified for phase 1. Revisit at phase 6 (drift monitoring).
- **Deterministic-only schema analysis (no LLM).** Rejected for phase 1. The product motivation is for users to *understand* their schema before authoring tasks — natural language is the highest-bandwidth UX for that. The deterministic-analysis layer is still coming, in phase 2; both will coexist.
- **Pure conversational agent with no persisted snapshot.** Rejected. Without a persisted snapshot, training jobs in later phases cannot pin to a reproducible schema state, and we lose the audit trail of what schema a model was trained against.
- **Extending `qwery-agent` rather than building a new app.** Rejected. `qwery-agent` is oriented at row-level querying; conflating it with schema-metadata reasoning would couple two lifecycles. Predictions is a separate product surface that will grow into training, inference, and registry — it deserves its own app.
- **Standalone `packages/predictions` package outside the apps registry.** Rejected. Duplicates LLM provider plumbing already in `agent-factory-sdk`; misses the contextual project shell that the rest of the console uses.
- **C++/Python in-process (FFI / WASM) instead of a Python sidecar (later phases).** Deferred for phase 1 — irrelevant here, but worth flagging that the phase-4 training RFC will need to revisit it. Phase 1 has no RELML execution at all, so the question doesn't bind us yet.

## 15. References

- [.claude/rules/spec-driven-dev.md](.claude/rules/spec-driven-dev.md)
- [.claude/rules/hexagonal-architecture.md](.claude/rules/hexagonal-architecture.md)
- [.claude/rules/i18n.md](.claude/rules/i18n.md)
- [.claude/rules/database.md](.claude/rules/database.md)
- [.claude/rules/security.md](.claude/rules/security.md)
- [.claude/rules/design-system.md](.claude/rules/design-system.md)
- [.claude/rules/architecture.md](.claude/rules/architecture.md)
- [docs/rfcs/0006-datasources.md](docs/rfcs/0006-datasources.md)
- [docs/rfcs/0008-qwery-agent.md](docs/rfcs/0008-qwery-agent.md)
- [docs/rfcs/0024-global-shell-ui.md](docs/rfcs/0024-global-shell-ui.md)
- [docs/rfcs/0026-llm-keys-management.md](docs/rfcs/0026-llm-keys-management.md)
- [docs/rfcs/0029-databases-app.md](docs/rfcs/0029-databases-app.md)
- RELML reference: `all_code.txt` examples (`binary_f1_example.py`, `f1_podium.py`, `ml1m_ratings.py`, `sunny_side_demand.py`) and the `qlm.qwery.relml` Python wrapper.
- **Qwery × RELML integration guide** (`tmp/relml_integration.md`) — canonical wiring blueprint adopted as the reference architecture for phases 2+. See Amendment A1 below.

---

## Amendments

### A1 — Qwery integration as the reference architecture for phases 2+ (2026-05-08)

**Why this amendment.** The original RFC (§6 Architecture, §12 Rollout plan) sketched phases 2–6 in broad strokes. We've since received the Qwery × RELML integration guide (`tmp/relml_integration.md`, 2,129 lines), a complete production playbook covering every layer phases 2–5 will need: agent services, DuckDB bundling, job orchestration, Python CLIs, diagnosis, improvement loops, and the 4-step Model Builder UI. **It supersedes our earlier hand-waved plan with a concrete blueprint** and is hereby adopted as the canonical reference architecture for phases 2+. Phase 1 (this spec) is unchanged — it remains the schema-understanding bedrock and is a *precursor* to what Qwery calls the Describe step's `schema-digest` and `suggest-ml-tasks` services.

**The 4-step Model Builder.** Phases 2–5 together deliver a single user surface — `/prj/{slug}/predictions` → "New model" → 4-step wizard:

```
 Step 1 Describe →  Step 2 Design  →  Step 3 Train  →  Step 4 Use
   suggest +         design agent      DuckDB bundle    predict +
   clarify           with primer +     + Python CLI     backtest +
   agents            schema-digest     + SSE log        improve
```

Each step persists to a `MLTrainingJob` record with lineage (`parentJobId`) so improvement attempts chain back to the original training run.

**Mapped components by phase.** Cross-references below point at sections of `tmp/relml_integration.md`:

| Phase | Qwery section | What ships | Key files we'll port (under our naming) |
|---|---|---|---|
| **2 — Schema digest + Suggest** | §9 (`schema-digest.ts`, `suggest-ml-tasks.service.ts`) | Token-efficient prompt projection of `DatasourceMetadata` + an LLM service that emits 3-6 plain-English `MLTaskSuggestion` items. Plumbs into the existing snapshot from phase 1. | `packages/agent-factory-sdk/src/services/schema-digest.ts`, `suggest-ml-tasks.service.ts` |
| **3 — Design (Describe step in UI)** | §9 (`clarify-ml-task.service.ts`, `design-ml-task.service.ts`, `relml-primer.ts`), §10 (`validate-design.ts`, `validate-task-design.ts`, `normalize-design.ts`, `quote-ident.ts`) | First-pass `clarify` agent (returns MCQs or `ready=true`); main `design` agent emitting a fully-typed `MLTaskDesign` with `task_sql` + `inference_schema` + `dataset_schema` + `hyperparameters`; binder validation against an in-memory DuckDB; semantic validators (leakage, FK casts, capacity). Retry-with-feedback up to 4×. | `apps/server/src/lib/ml/{validate-design,validate-task-design,normalize-design,quote-ident}.ts`, agent services |
| **4 — Train (Design + Train steps in UI)** | §10 (`bundle-builder.ts`, `job-manager.ts`), §13 (`train_cli.py`, `backtest_cli.py`), §11 (`/api/ml-tasks` router, `train` + `train/:id/stream` SSE), §12 (`restoreJobsFromDisk`) | DuckDB bundle builder (extracts source tables via existing driver, infers DuckDB types, computes inclusive backtest cutoff for temporal splits); `job-manager` with on-disk persistence under `${QWERY_STORAGE_DIR}/ml/<jobId>/`; Python sidecar (`train_cli.py`); SSE-streamed log + status events; Hono `/api/ml-tasks/train*` routes. | `apps/server/src/lib/ml/{bundle-builder,job-manager,parse-metrics}.ts`, `apps/server/src/routes/ml-tasks.ts`, `python/train_cli.py`, `python/backtest_cli.py` |
| **5 — Use (predict + backtest)** | §10 (`predict.ts`), §13 (`predict_cli.py`), §11 (`/predict`, `/backtest` routes), §15-16 (Web UI) | Schema-aware single prediction (`predict.ts` validates inputs against `MLInferenceSchema`, spawns `predict_cli.py`, returns `{ok, value}`); backtest reads `backtest.json` from disk; UI inference panel auto-generates a form from the inference schema; metrics charts; backtest panel. | `apps/server/src/lib/ml/predict.ts`, `python/predict_cli.py`, model-builder UI components |
| **6 — Improve (improvement + recovery loop)** | §9 (`improve-ml-task.service.ts`, `diagnosis-playbook.ts`), §10 (`compute-diagnosis.ts`), §11 (`/improve`, `/recover` routes) | Post-training structured diagnosis (val curve shape, gap evolution, tail slope, leakage suspicion); improvement agent reads lineage + diagnosis + (optionally) captured stderr tail; emits `MLImprovementProposal { design, changes[], rationale, confidence }`; `/recover` is the same agent gated on a failed parent run. | `apps/server/src/lib/ml/compute-diagnosis.ts`, `improve-ml-task.service.ts`, `diagnosis-playbook.ts` |

**Naming alignment.** Qwery uses the `ml-tasks` / `MLTask*` prefix (predictions = ML tasks). We continue using the `predictions` / `Prediction*` prefix. The mapping is purely cosmetic; the integration patterns map 1:1.

**Integration-doc ↔ our codebase translations.**

| Qwery doc says | We translate to |
|---|---|
| `apps/server/src/lib/ml/` | `apps/server/src/lib/predictions/` |
| `apps/server/src/routes/ml-tasks.ts` | `apps/server/src/routes/predictions.ts` (extend the existing file) |
| `MLTaskDesign` Zod entity | `PredictionTaskDesign` under `packages/domain/src/entities/predictions/` |
| `/api/ml-tasks/...` | `/api/predictions/tasks/...` |
| `${QWERY_STORAGE_DIR}/ml/<jobId>/` | `${QLM_STORAGE_DIR}/predictions/<jobId>/` |
| `apps/web/app/routes/datasource/model-builder.tsx` | A new flat route under `@qlm/app-predictions` (we already have the snapshot detail page; add a "New model" entry that opens the 4-step builder) |
| `lib/repositories/ml-tasks-client.ts` | Extend `apps/web/src/lib/repositories/prediction-*.repository.ts` and the shell-runtime `predictions` resource |

**Dependencies we'll add (when we start phase 2):**
- Server: `@duckdb/node-api@1.4.2-r.1` (used by `validate-design` for binder validation against an in-memory DuckDB and by `bundle-builder` for materializing the training bundle).
- Python env: install `qlm.qwery.relml` from the RELML repo into the venv `Bun.spawn` will launch.
- Server tsconfig: `experimentalDecorators: true` + `emitDecoratorMetadata: true` (required by the agent SDK's runtime libs).
- Web (later): `motion@^12.23.24` if we want the Qwery design animations; otherwise omit.

**Environment variables we'll introduce (phase 4):**
- `QLM_PYTHON_BIN` — interpreter for the venv with `qlm.qwery.relml` installed (default `python3`).
- `QLM_STORAGE_DIR` — root for job artifacts; defaults to repo-root `qwery.db/` already used by the server.
- `QLM_PREDICTIONS_TRAIN_CLI`, `QLM_PREDICTIONS_PREDICT_CLI`, `QLM_PREDICTIONS_BACKTEST_CLI` — absolute paths to the three Python CLIs (defaults relative to `process.cwd()`).

**Adopted contracts (verbatim from Qwery, will live in our domain layer):**
- `MLTaskDesign` shape (Qwery §19.1) — single source of truth for what gets serialized to `design.json` and read by the Python CLIs.
- SSE event protocol (Qwery §19.2) — `event: log` + `event: status` with terminal closure.
- Predict request/response (Qwery §19.3) — `{inputs: Record<string,string>}` → `{success: true, data: {ok: true, value: number}}`.
- Improvement proposal (Qwery §19.4) — `{design, changes[], rationale, confidence}`, with `/recover` differing only by the `runtimeError` arg.
- Filesystem layout per job (Qwery §20) — `job.json / design.json / bundle.duckdb / train.log / model.bin / model.schema.json / backtest.json`.

**Two design decisions adopted explicitly (from Qwery's experience):**

1. **`status: succeeded` means "diagnosis is ready"**, not just "Python exited 0". The job-manager runs `backtest_cli.py` and `computeDiagnosis` *inside* the success path before flipping status. Clients can rely on this — the improvement panel works the moment the job succeeds.
2. **Three layers of leakage protection.** SQL-level (cast leaky integers to VARCHAR), Python-level (`type='text'` rewrite for the label column), C++-level (`HeteroEncoder.set_target` guard). The `validate-task-design` semantic check enforces the SQL-level discipline at design time so users can't ship leaky `task_sql`.

**Out of scope for this amendment (still in the original RFC's deferred items):**
- GPU compute targets — Qwery's playbook is CPU-only; we revisit at phase 6.
- Cross-project model sharing — out of roadmap.
- Drift detection — phase 6 unchanged.

**Amendment review checklist.**
- [ ] Phase 1 spec (`docs/specs/0030-predictions-relml-phase1.md`) §13 Follow-ups updated to point at the Qwery sections per phase.
- [ ] When phase 2 starts, every component listed in the table above has a corresponding work item in the phase-2 spec.
- [ ] We do NOT copy Qwery's source files verbatim; we port them, renaming `MLTask*` → `PredictionTask*` and following our hexagonal layering rules.

---

## Review checklist for the author

- [ ] Does §1 make the scope obvious in one paragraph?
- [ ] Is every §3.1 goal an observable exit criterion?
- [ ] Is every §3.2 non-goal pinned to a named future phase?
- [ ] Does §4 distinguish reused prior art from replaced prior art?
- [ ] Would a newcomer understand the concept after reading only §1 through §5?
- [ ] Are the open questions real decisions, or are any of them placeholders?
- [ ] Does the rollout plan match realistic engineering capacity for the next quarters?
- [ ] Does every alternative in §14 have a concrete reason it was not chosen?
