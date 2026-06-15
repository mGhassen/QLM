# Spec — Predictions (RELML integration) (phase 1)

| Field        | Value                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| Status       | Draft                                                                                  |
| Author       | Wael Ben Amara                                                                         |
| Created      | 2026-05-08                                                                             |
| Implements   | [RFC 0030 — Predictions (RELML integration)](../rfcs/0030-predictions-relml.md)        |
| Target phase | Phase 1                                                                                |

This document is the implementation spec for RFC 0030. The RFC establishes the *why* and *shape*; this spec defines the *what* and *how*: resolved open questions, exact data shapes, API contracts, functional flows, file-by-file work items, and a verification plan.

Scope is strict to phase 1. Everything out of scope is deferred to its own phase and does not appear here.

---

## 1. Resolved open questions

| # | Question | Resolution for phase 1 |
| - | -------- | ---------------------- |
| 1 | Conversation retention / lifecycle. | **Keep forever in phase 1.** No GC, no expiry. Revisit at phase 5 if storage volume becomes load-bearing. |
| 2 | Per-snapshot vs per-datasource agent context. | **Single snapshot only.** A conversation is pinned to exactly one snapshot at creation time and cannot span snapshots. Cross-snapshot is a phase-6 concern. |
| 3 | System-prompt injection guardrails. | **Scope-locked system prompt; tool use disabled.** The agent receives a system prompt that strictly bounds its job to "answer questions about THIS schema, refuse anything else"; no tool-calling APIs are bound. |

## 2. User stories

- As a project member, I can open the **Predictions** app inside any project shell and see every datasource in the project with its snapshot status.
- As a project member, I can take an immutable, versioned schema snapshot of a datasource I can already read.
- As a project member, I can open a snapshot and explore tables, columns, primary keys, and foreign-key relationships read-only.
- As a project member, I can open a chat panel scoped to one snapshot and ask natural-language questions about the schema.

## 3. Functional flow

### 3.1 Information architecture

- App id: `predictions`. Bucket: `ai`. Sidebar order: 7.
- Contextual route: `/prj/{projectSlug}/predictions` — list view.
- Flat route: `/prediction-snapshot/{snapshotId}` — snapshot detail (schema explorer + agent panel as tabs).
- App is auto-discovered by `apps/web/src/shell/app-registry.ts` from the new `packages/apps/predictions` package; no host changes required for discovery itself.

### 3.2 Screen-by-screen

**List view** (`PredictionsPluginRoot`)
- Header: "Predictions" title + tagline; no primary CTA (datasources are created in the Datasources app).
- Body: `EntityListPage`-style grid. Each card represents a datasource and shows: provider icon, datasource name, snapshot count, latest snapshot timestamp. Primary action per card: "Take snapshot" if none, "Open latest" otherwise. Secondary action: "View snapshots" (history).
- Empty state: "No datasources yet — connect one in the Datasources app." with link to `/prj/{slug}/datasources`.
- Error / loading: standard list skeleton + destructive-tinted retry block.

**Detail view** (`PredictionSnapshotFlatRoot`)
- Hero: 12×12 status tile with database icon + datasource name + snapshot version + `taken_at` timestamp.
- Tabs (industrial chip toggle): **Schema** (default) and **Ask agent**.
- **Schema tab**: read-only table list driven by snapshot `metadata`. Click a table → drilldown to columns + primary keys + relationships. Mirrors `DatasourceTablesPanel` / `DatasourceColumnsPanel` recipes.
- **Ask agent tab**: chat layout. System message header: "Ask me about this schema." Streaming assistant responses. Composer pinned bottom. Empty state: 3 suggested prompts ("What tables join through ...?", "Which columns look like timestamps?", "Where would the labels for a churn task live?").
- Loading / error states match the design system recipes (§6 of `.claude/rules/design-system.md`).

### 3.3 User flows

1. **Take a snapshot.** From list → click "Take snapshot" on a datasource → server fetches `driver.metadata()` → persists row → list refreshes → user is navigated to `/prediction-snapshot/{id}`.
2. **Explore a snapshot.** Open snapshot → Schema tab is active → click a table → see columns and FK relationships.
3. **Ask the agent.** Open snapshot → Ask agent tab → type a question → response streams in token by token.

### 3.4 Errors and edges

- Driver unreachable when taking snapshot → 502 with `{ error: 'datasource_unreachable' }` → toast "Datasource is unreachable. Try again later."
- Snapshot exceeds 5 MB jsonb cap → server returns 413 → toast "Schema is too large to snapshot in this phase."
- LLM provider failure → assistant message replaced with a destructive inline error and a "Retry" button.
- User lacks `datasources.read` on the datasource → 403 → list view shows "Permission required" tile for that datasource.

## 4. Technical flow

### 4.1 Layered sequence

**Take snapshot**
```
UI ──takeSnapshot()──▶ shell.predictions.snapshots.take(datasourceId)
                          │
                          ▼
                       HTTP POST /api/predictions/datasources/:id/snapshots
                          │
                          ▼
                       server: load datasource via repos.datasource
                          │
                          ▼
                       resolve driver via ExtensionsRegistry + getDriverInstance
                          │
                          ▼
                       driver.metadata() (or HTTP-dispatched for browser-runtime
                          via client-side fallback path — see 4.2)
                          │
                          ▼
                       TakeSnapshotService.execute(datasourceId, projectId, metadata, takenBy)
                          │
                          ▼
                       repo.predictionSchemaSnapshot.create(...)
                          │
                          ▼
                       audit "predictions.snapshot.taken" → return row
```

**Ask agent (streaming)**
```
UI ──send(message)──▶ shell.predictions.agent.send(snapshotId, history)
                          │
                          ▼
                       HTTP POST /api/predictions/snapshots/:id/agent (SSE/text-stream)
                          │
                          ▼
                       server: load snapshot, project-scope check
                          │
                          ▼
                       project metadata → SimpleSchema → system prompt
                          │
                          ▼
                       streamText({ model, system, messages }).toTextStreamResponse()
                          │
                          ▼
                       UI reads body stream → updates assistant message live
```

### 4.2 Component split

- `packages/features/predictions` — pure presentation: `PredictionsList`, `PredictionsCard`, `PredictionSnapshotHero`, `PredictionSchemaPanel`, `PredictionAgentPanel`, `PredictionAgentMessageList`, `PredictionAgentComposer`. No data access.
- `packages/apps/predictions` — manifest + plugin-root. Plugin-root composes feature components, calls `useShell()`, manages local UI state (active tab, composer text, streaming state).
- Browser-runtime drivers: when the server route detects `driver.runtime !== 'node'`, it returns 422 with `{ error: 'browser_runtime_only', hint: 'snapshot via the client' }`. The client falls back to calling `shell.datasources.metadata(...)` (existing host dispatch) and POSTs the resulting metadata to a sibling route `POST /api/predictions/datasources/:id/snapshots/from-client` for persistence. Both routes converge on the same `TakeSnapshotService`.

## 5. API contracts

### 5.1 Data shapes (TypeScript)

```ts
// packages/domain/src/entities/prediction-schema-snapshot.type.ts
export const PredictionSchemaSnapshotSchema = z.object({
  id: z.uuid(),
  datasourceId: z.uuid(),
  projectId: z.uuid(),
  version: z.number().int().positive(),
  metadata: DatasourceMetadataZodSchema,
  takenBy: z.uuid(),
  takenAt: z.date(),
});
export type PredictionSchemaSnapshot = z.infer<typeof PredictionSchemaSnapshotSchema>;

// packages/domain/src/usecases/dto/prediction-usecase-dto.ts
export type TakeSnapshotInput = {
  datasourceId: string;
  projectId: string;
  metadata: DatasourceMetadata; // must validate against DatasourceMetadataZodSchema
  takenBy: string;
};

export type AskAgentInput = {
  snapshotId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
};
```

### 5.2 Endpoints

| Method | Path                                                            | Auth      | Body                                                       | Response                      | Status        |
| ------ | --------------------------------------------------------------- | --------- | ---------------------------------------------------------- | ----------------------------- | ------------- |
| POST   | `/api/predictions/datasources/:id/snapshots`                    | session   | `{}` (server resolves datasource → driver → metadata)      | `PredictionSchemaSnapshot`    | 201 / 4xx     |
| POST   | `/api/predictions/datasources/:id/snapshots/from-client`        | session   | `{ metadata: DatasourceMetadata }`                         | `PredictionSchemaSnapshot`    | 201 / 4xx     |
| GET    | `/api/predictions/datasources/:id/snapshots`                    | session   | —                                                          | `PredictionSchemaSnapshot[]`  | 200           |
| GET    | `/api/predictions/snapshots/:id`                                | session   | —                                                          | `PredictionSchemaSnapshot`    | 200 / 404     |
| POST   | `/api/predictions/snapshots/:id/agent`                          | session   | `{ messages: AskAgentInput['messages'] }`                  | `text/event-stream` (text)    | 200 / 4xx     |

### 5.3 Rate, pagination, caching

- `POST .../snapshots`: 6/min per user per datasource.
- `POST .../agent`: 30/min per user per snapshot.
- Lists: no pagination (per-project snapshot count is small in phase 1; revisit at phase 5).
- React Query: `gcTime: 5min`, `staleTime: 1min` for list + detail; agent is uncached (always fresh).

## 6. Data model

### 6.1 Schema

New numbered SQL file under `apps/web/supabase/schemas/`. Pick the next free number at implementation time.

```sql
create table public.prediction_schema_snapshots (
  id uuid primary key default extensions.uuid_generate_v4(),
  datasource_id uuid not null references public.datasources(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null,
  metadata jsonb not null,
  taken_by uuid not null references auth.users(id),
  taken_at timestamptz not null default now(),
  unique (datasource_id, version)
);

create index ix_prediction_schema_snapshots_datasource
  on public.prediction_schema_snapshots (datasource_id, version desc);

alter table public.prediction_schema_snapshots enable row level security;
revoke all on public.prediction_schema_snapshots from authenticated, service_role;
grant select, insert on public.prediction_schema_snapshots to authenticated;

create policy "snapshots_read"
  on public.prediction_schema_snapshots for select
  to authenticated using (
    public.has_role_on_organization(
      (select organization_id from public.projects where id = project_id)
    )
  );

create policy "snapshots_write"
  on public.prediction_schema_snapshots for insert
  to authenticated with check (
    public.has_role_on_organization(
      (select organization_id from public.projects where id = project_id)
    )
  );
-- No update, no delete policies. Append-only.

-- Conversations and messages
create table public.prediction_agent_conversations (
  id uuid primary key default extensions.uuid_generate_v4(),
  snapshot_id uuid not null references public.prediction_schema_snapshots(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prediction_agent_messages (
  id uuid primary key default extensions.uuid_generate_v4(),
  conversation_id uuid not null references public.prediction_agent_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.prediction_agent_conversations enable row level security;
alter table public.prediction_agent_messages enable row level security;
revoke all on public.prediction_agent_conversations from authenticated, service_role;
revoke all on public.prediction_agent_messages from authenticated, service_role;
grant select, insert, update on public.prediction_agent_conversations to authenticated;
grant select, insert on public.prediction_agent_messages to authenticated;

create policy "conversations_read"
  on public.prediction_agent_conversations for select
  to authenticated using (
    public.has_role_on_organization(
      (select organization_id from public.projects where id = project_id)
    )
  );

create policy "conversations_write"
  on public.prediction_agent_conversations for insert
  to authenticated with check ( created_by = auth.uid() );

create policy "conversations_update_own"
  on public.prediction_agent_conversations for update
  to authenticated using ( created_by = auth.uid() );

create policy "messages_read"
  on public.prediction_agent_messages for select
  to authenticated using (
    exists (
      select 1 from public.prediction_agent_conversations c
      where c.id = conversation_id and public.has_role_on_organization(
        (select organization_id from public.projects where id = c.project_id)
      )
    )
  );

create policy "messages_write"
  on public.prediction_agent_messages for insert
  to authenticated with check (
    exists (
      select 1 from public.prediction_agent_conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
  );
```

After the SQL is added: `pnpm supabase:web:reset && pnpm supabase:web:typegen`.

### 6.2 Config / payload contracts

`metadata` jsonb is validated with `DatasourceMetadataZodSchema` at the domain boundary (server route `zValidator('json', ...)` for the `from-client` route; service-side validation for the server-fetched route). Hard cap: 5 MB serialized JSON; rejected with HTTP 413.

### 6.3 Secrets contract

No new secrets. LLM provider keys are read by `agent-factory-sdk` from `process.env` (`AZURE_API_KEY` / `ANTHROPIC_API_KEY` / etc., already in `apps/server/.env.example`).

## 7. File-by-file work items

### 7.1 Domain (`packages/domain`)

- `src/entities/prediction-schema-snapshot.type.ts` — Zod schema + `PredictionSchemaSnapshot` + `PredictionSchemaSnapshotEntity` (mirror `notebook.type.ts` pattern).
- `src/entities/prediction-agent-conversation.type.ts` — entity + Zod.
- `src/entities/prediction-agent-message.type.ts` — entity + Zod.
- `src/entities/index.ts` — export the three new entities.
- `src/repositories/prediction-schema-snapshot.port.ts` — abstract repository: `create`, `listByDatasource`, `findById`, `findLatestByDatasource`.
- `src/repositories/prediction-agent-conversation.port.ts` — `create`, `findById`, `listBySnapshot`.
- `src/repositories/prediction-agent-message.port.ts` — `create`, `listByConversation`.
- `src/repositories/index.ts` — export ports + add to `Repositories` interface.
- `src/usecases/dto/prediction-usecase-dto.ts` — input/output DTOs.
- `src/services/prediction/take-snapshot.usecase.ts` — `TakeSnapshotService`.
- `src/services/prediction/list-snapshots.usecase.ts`, `get-snapshot.usecase.ts`.
- `src/services/prediction/create-conversation.usecase.ts`, `append-message.usecase.ts`, `list-messages.usecase.ts`.
- `src/services/index.ts` — re-export.
- Tests next to each service: `*.test.ts` using mock repositories.

### 7.2 Adapters (`packages/repositories/supabase` and `apps/web/src/lib/repositories`)

- `packages/repositories/supabase/src/prediction-schema-snapshot.repository.ts`.
- `packages/repositories/supabase/src/prediction-agent-conversation.repository.ts`.
- `packages/repositories/supabase/src/prediction-agent-message.repository.ts`.
- `packages/repositories/supabase/src/index.ts` — export.
- `apps/web/src/lib/repositories/prediction-schema-snapshot.repository.ts` — HTTP adapter.
- `apps/web/src/lib/repositories/prediction-agent-conversation.repository.ts`.
- `apps/web/src/lib/repositories/prediction-agent-message.repository.ts`.
- `apps/web/src/lib/repositories-factory.ts` — wire all three.

### 7.3 Shell runtime (`packages/shell-runtime`)

- `src/resources/predictions.ts` — `createPredictionsResource(...)` returning `{ snapshots: { list, latest, take, get, takeFromClient }, agent: { stream } }` plus `keys` and `invalidate`.
- `src/client.ts` — wire the resource into `useShell()`.
- `src/context.ts` — add `predictionsAgentStreamFn` (the host implements it as a `fetch` wrapper that returns a `ReadableStream<string>` of assistant text).

### 7.4 Server (`apps/server`)

- `src/routes/predictions.ts` — Hono router for the five endpoints in §5.2.
- `src/server.ts` — register `api.route('/predictions', createPredictionsRoutes(getRepos))`.
- `src/lib/predictions/build-system-prompt.ts` — `(metadata: DatasourceMetadata, datasourceName: string) => string` returning a scope-locked system prompt with a SimpleSchema projection embedded.
- `__tests__/predictions.test.ts` — route tests (happy path, browser-runtime → 422, RLS-style permission denial, 5MB cap).

### 7.5 Presentation — feature package (`packages/features/predictions`)

- `package.json`, `tsconfig.json`, `eslint.config.mjs`.
- `src/index.ts` — barrel.
- `src/predictions-list.tsx` — grid of datasource cards.
- `src/predictions-card.tsx` — single card.
- `src/prediction-snapshot-hero.tsx` — header for detail view.
- `src/prediction-schema-panel.tsx` — table list + columns drilldown.
- `src/prediction-agent-panel.tsx` — chat layout (composer + message list + streaming).
- `src/prediction-agent-message-list.tsx`, `src/prediction-agent-composer.tsx`.
- `src/__stories__/*.stories.tsx` — at least one Storybook story per component.

### 7.6 Shell app (`packages/apps/predictions`)

- `package.json`, `tsconfig.json`.
- `src/manifest.ts` — `PluginManifest` with id `predictions`, bucket `ai`, contextual `routeBase: 'predictions'`, `flatRoute: { prefix: 'prediction-snapshot', params: ['snapshotId'] }`.
- `src/plugin-root.tsx` — default export (list view) + `FlatRoot` (detail) + `resolveProjectContext` (load snapshot → snapshot.projectId).
- `src/use-take-snapshot.ts` — mutation hook that decides node-runtime vs client-runtime path.
- `src/use-agent-stream.ts` — hook that posts to agent endpoint and surfaces a streamed string + done flag.
- `src/index.ts` — barrel.

### 7.7 i18n (`packages/i18n` + `apps/web/src/lib/i18n`)

- `apps/web/src/lib/i18n/locales/en/predictions.json` — full key map (see §11).
- `apps/web/src/lib/i18n/i18n.settings.ts` — append `'predictions'` to `defaultI18nNamespaces`.

## 8. Permissions and RLS

- **No new permission enum value.** Snapshot create + agent use both gate on `datasources.read` (already granted to org members).
- RLS policies as in §6.1.
- All RLS uses `has_role_on_organization`; no `SECURITY DEFINER` functions are added in phase 1.

## 9. Security checklist

- [ ] `metadata` jsonb size capped at 5 MB at the route layer; reject larger payloads with 413.
- [ ] User-typed agent messages redacted from logs (`pino` redact path: `req.body.messages[*].content`).
- [ ] Agent system prompt explicitly forbids: tool use, side effects, unrelated topics, hallucinating PKs/FKs absent from the snapshot.
- [ ] Rate limits enforced server-side per §5.3.
- [ ] Audit events emitted **before** the mutation: `predictions.snapshot.taken`, `predictions.conversation.created`, `predictions.conversation.message_sent`.
- [ ] No service role usage in any user-facing predictions route.
- [ ] All Hono validators use `zValidator` with explicit Zod schemas.
- [ ] Snapshot `metadata` is parsed through `DatasourceMetadataZodSchema` before persistence (defends against malformed driver output).

## 10. Verification plan

### 10.1 Static
`pnpm typecheck && pnpm lint && pnpm format`.

### 10.2 Unit
- Domain: services in `packages/domain` against mock repositories. Branches: happy path, snapshot-too-large rejection, version increments correctly.
- Server: route tests in `apps/server/__tests__/predictions.test.ts` using `createMockRepositories()` and a stubbed driver registry.

### 10.3 Integration
Skipped in phase 1 — covered by the smoke step. (Local Supabase reset + a single end-to-end flow is enough confidence.)

### 10.4 End-to-end
None in phase 1. Defer to phase 5 once the surface is stable.

### 10.5 Manual smoke
1. `pnpm supabase:web:start && pnpm supabase:web:reset && pnpm supabase:web:typegen`.
2. `pnpm dev`.
3. Sign in. Open any project. Navigate to `Predictions` in the sidebar.
4. Click "Take snapshot" on a datasource that exposes `metadata()`.
5. Confirm the snapshot opens, schema tab lists tables.
6. Switch to "Ask agent" tab, type "Which tables join through user_id?", confirm a streamed answer that names tables present in the schema.

## 11. i18n key map

Namespace: `predictions`.

```
predictions.title                   = "Predictions"
predictions.tagline                 = "Understand your data before you train on it."
predictions.list.empty.title        = "No datasources yet"
predictions.list.empty.description  = "Connect a datasource in the Datasources app to take your first snapshot."
predictions.list.empty.cta          = "Open Datasources"
predictions.card.snapshot.none      = "No snapshot yet"
predictions.card.snapshot.takenAt   = "Latest snapshot {{when}}"
predictions.card.action.take        = "Take snapshot"
predictions.card.action.open        = "Open latest"
predictions.card.action.history     = "View snapshots"
predictions.snapshot.title          = "{{name}} · v{{version}}"
predictions.snapshot.takenAt        = "Taken {{when}} by {{user}}"
predictions.snapshot.tab.schema     = "Schema"
predictions.snapshot.tab.agent      = "Ask agent"
predictions.snapshot.schema.empty   = "Snapshot has no tables."
predictions.agent.empty.title       = "Ask me about this schema"
predictions.agent.empty.suggestion1 = "Which tables join through which keys?"
predictions.agent.empty.suggestion2 = "Which columns look like timestamps?"
predictions.agent.empty.suggestion3 = "Where would target labels for a churn task live?"
predictions.agent.composer.placeholder = "Ask a question about this schema..."
predictions.agent.composer.send     = "Send"
predictions.agent.error.generic     = "The agent is unavailable. Try again."
predictions.toast.snapshot.success  = "Snapshot taken."
predictions.toast.snapshot.failure  = "Failed to take snapshot."
predictions.toast.snapshot.tooLarge = "Schema is too large to snapshot."
```

## 12. Implementation sequencing

Stories `/spec-to-stories` will produce, in order. Each is one verb-first slice ~1–3 days.

**Stage A — types and UI scaffolding**
1. **add-domain-primitives** — entities + ports + DTOs + service stubs (§7.1).
2. **scaffold-features-and-app-packages** — empty `packages/features/predictions` and `packages/apps/predictions` with manifests, tsconfigs, package.jsons; sidebar entry visible but views show empty stubs (§7.5, §7.6).

**Stage B — data and domain**
3. **add-rls-schema-and-types** — SQL files + RLS + `pnpm supabase:web:reset && typegen` + Supabase repository implementations (§6, §7.2 supabase side).
4. **wire-domain-services** — implement `TakeSnapshotService`, list/get, conversation create + append; unit tests (§7.1 services).

**Stage C — server**
5. **add-server-routes** — five endpoints in `apps/server/src/routes/predictions.ts`; system-prompt builder; route tests (§7.4).

**Stage D — web wiring**
6. **wire-shell-runtime-and-http-adapters** — HTTP adapters in `apps/web/src/lib/repositories`; `predictionsAgentStreamFn` in host context; `predictions` resource in `shell-runtime`; factory wiring (§7.2 web side, §7.3).
7. **build-list-and-snapshot-views** — `PredictionsList`, `PredictionsCard`, `PredictionSnapshotHero`, `PredictionSchemaPanel`, plugin-root list + flat-root detail; storybook stories (§7.5, §7.6).
8. **build-agent-chat-panel** — `PredictionAgentPanel` + composer + message list + streaming hook; integrate into snapshot detail (§7.5, §7.6).

**Stage E — polish and verification**
9. **add-i18n-and-smoke** — English locale, namespace registration, manual-smoke pass per §10.5; finalize Storybook stories (§7.7, §10).

## 13. Follow-ups (deferred, not in this phase)

### Snapshot-side polish (small, can land any time post-phase-1)

- Schema diff viewer between snapshot versions.
- Conversation list view (today, conversations are reachable only from the snapshot they belong to).
- Auto-snapshot on schema drift detection.
- Bulk snapshot all datasources in a project.

### Phase 2+ — adopt the Qwery × RELML integration blueprint

RFC 0030 Amendment A1 adopts `tmp/relml_integration.md` as the canonical reference architecture for phases 2 onwards. Each future phase maps directly to a section of that document. When the corresponding phase RFC + spec are scaffolded, they should:

| Phase | Pull from `tmp/relml_integration.md` | New under our naming |
|---|---|---|
| **2 — Schema digest + Suggest** | §9 — `schema-digest.ts`, `suggest-ml-tasks.service.ts` | `packages/agent-factory-sdk/src/services/{schema-digest,suggest-prediction-tasks}.ts` |
| **3 — Design (Describe + Design steps)** | §9 — `clarify-ml-task.service.ts`, `design-ml-task.service.ts`, `relml-primer.ts`; §10 — `validate-design.ts`, `validate-task-design.ts`, `normalize-design.ts`, `quote-ident.ts` | `apps/server/src/lib/predictions/{validate-design,validate-task-design,normalize-design,quote-ident}.ts` + new agent services |
| **4 — Train (Train step)** | §10 — `bundle-builder.ts`, `job-manager.ts`, `parse-metrics.ts`; §11 — `/train` + `/train/:id/stream` SSE; §12 — `restoreJobsFromDisk`; §13 — `train_cli.py`, `backtest_cli.py` | `apps/server/src/lib/predictions/{bundle-builder,job-manager,parse-metrics}.ts`, `apps/server/src/routes/predictions.ts` (extended), `python/{train,backtest}_cli.py` |
| **5 — Use (Use step)** | §10 — `predict.ts`; §13 — `predict_cli.py`; §11 — `/predict`, `/backtest`; §15-16 — Web Model Builder UI | `apps/server/src/lib/predictions/predict.ts`, `python/predict_cli.py`, model-builder route inside `@qlm/app-predictions` |
| **6 — Improve (improvement + recovery)** | §9 — `improve-ml-task.service.ts`, `diagnosis-playbook.ts`; §10 — `compute-diagnosis.ts`; §11 — `/improve`, `/recover` | `apps/server/src/lib/predictions/compute-diagnosis.ts` + improvement agent service |

**Adopted verbatim from Qwery (when phase 4 lands):**
- `MLTaskDesign` Zod shape (§19.1) → renamed `PredictionTaskDesign` under `packages/domain/src/entities/predictions/`.
- SSE event protocol (§19.2): `event: log` lines + terminal `event: status`.
- Predict request/response (§19.3): `{inputs: Record<string,string>}` → `{success, data: {ok, value}}`.
- Improvement proposal (§19.4): `{design, changes[], rationale, confidence}`.
- Job filesystem layout (§20): `${QLM_STORAGE_DIR}/predictions/<jobId>/{job.json,design.json,bundle.duckdb,train.log,model.bin,model.schema.json,backtest.json}`.

**Deps added in phase 2+ (NOT in phase 1):**
- `@duckdb/node-api@1.4.2-r.1` (server) — binder validation + bundle building.
- `experimentalDecorators` + `emitDecoratorMetadata` in `apps/server/tsconfig.json`.
- `qlm.qwery.relml` Python package installed into the spawn venv.
- Env: `QLM_PYTHON_BIN`, `QLM_STORAGE_DIR`, `QLM_PREDICTIONS_{TRAIN,PREDICT,BACKTEST}_CLI`.

The integration-doc blueprint is **not** copied verbatim — every file is ported through our hexagonal layers (domain → ports → services → adapters → routes → shell-runtime → app), and the `MLTask*` prefix becomes `PredictionTask*`.

---

## Changelog

One line per deviation from this spec discovered during implementation.

-
