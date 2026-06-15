# RelML × Qwery Integration Guide

This document is a precise, step-by-step record of **how RelML was integrated into qwery-core** so the same integration can be replicated in another project. It is not the RelML library guide (that lives in `relml.md`); it is the wiring layer that turns RelML into a SaaS feature: an HTTP API, an agentic design pipeline, a job runner, a DuckDB bundling layer, and a 4-step React Model Builder.

Every modified file, every new file, every dependency, every environment variable, every contract between the layers is enumerated below.

---

## Table of contents

1. [Architecture at a glance](#1-architecture-at-a-glance)
2. [What was added — file inventory](#2-what-was-added--file-inventory)
3. [What was modified — diff inventory](#3-what-was-modified--diff-inventory)
4. [Prerequisites](#4-prerequisites)
5. [Step 1 — Install runtime dependencies](#5-step-1--install-runtime-dependencies)
6. [Step 2 — Add domain types (`@qwery/domain`)](#6-step-2--add-domain-types-qwerydomain)
7. [Step 3 — Extend the extensions SDK with `rowCounts`](#7-step-3--extend-the-extensions-sdk-with-rowcounts)
8. [Step 4 — Upgrade the PostgreSQL driver (types + row counts)](#8-step-4--upgrade-the-postgresql-driver-types--row-counts)
9. [Step 5 — Add agent services (`@qwery/agent-factory-sdk`)](#9-step-5--add-agent-services-qweryagent-factory-sdk)
10. [Step 6 — Add server library (`apps/server/src/lib/ml`)](#10-step-6--add-server-library-appsserversrclibml)
11. [Step 7 — Mount the `/api/ml-tasks` HTTP routes](#11-step-7--mount-the-apiml-tasks-http-routes)
12. [Step 8 — Wire startup (`restoreJobsFromDisk`)](#12-step-8--wire-startup-restorejobsfromdisk)
13. [Step 9 — Add the Python CLIs](#13-step-9--add-the-python-clis)
14. [Step 10 — Install RelML in the Python environment](#14-step-10--install-relml-in-the-python-environment)
15. [Step 11 — Add the Web Model Builder route](#15-step-11--add-the-web-model-builder-route)
16. [Step 12 — Wire route, navigation, paths, i18n](#16-step-12--wire-route-navigation-paths-i18n)
17. [Step 13 — Configure environment variables](#17-step-13--configure-environment-variables)
18. [Step 14 — Smoke test the full pipeline](#18-step-14--smoke-test-the-full-pipeline)
19. [Contracts reference](#19-contracts-reference)
20. [Filesystem layout of a training job](#20-filesystem-layout-of-a-training-job)
21. [Troubleshooting](#21-troubleshooting)

---

## 1. Architecture at a glance

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Browser — apps/web                                                     │
 │   /ds/:slug/model-builder route                                        │
 │   Steps: Describe → Design → Train → Use                               │
 │   ml-tasks-client.ts  (REST + SSE wrappers)                            │
 └───────────────┬────────────────────────────────────────────────────────┘
                 │ HTTPS
 ┌───────────────▼────────────────────────────────────────────────────────┐
 │ Server — apps/server (Hono, Bun)                                       │
 │   /api/ml-tasks/{suggest,design,clarify,train,improve,recover,...}     │
 │                                                                        │
 │   ┌──────────────── lib/ml ────────────────────┐                       │
 │   │ validate-design.ts    (DuckDB SQL binder)  │                       │
 │   │ validate-task-design  (semantic checks)    │                       │
 │   │ normalize-design.ts   (strip schema prefix)│                       │
 │   │ bundle-builder.ts     (build .duckdb file) │                       │
 │   │ job-manager.ts        (spawn + persist)    │                       │
 │   │ predict.ts            (predict subprocess) │                       │
 │   │ parse-metrics.ts      (read trainer log)   │                       │
 │   │ compute-diagnosis.ts  (overfit / leakage)  │                       │
 │   └───────────────────────────────────────────┘                       │
 │                                                                        │
 │   agent-factory-sdk services:                                          │
 │     suggest-ml-tasks, clarify-ml-task, design-ml-task,                 │
 │     improve-ml-task   ← all use generateObject() against an LLM        │
 │     relml-primer.ts, diagnosis-playbook.ts (prompt fragments)          │
 │     schema-digest.ts (compress metadata for prompt)                    │
 └───────────────┬────────────────────────────────────────────────────────┘
                 │ Bun.spawn(python3 …)
 ┌───────────────▼────────────────────────────────────────────────────────┐
 │ Python subprocess — python/                                            │
 │   train_cli.py  (relml.train  → model.bin + schema.json)               │
 │   backtest_cli.py (relml.load_model → write backtest.json)             │
 │   predict_cli.py  (relml.load_model → predict({...}) → stdout JSON)    │
 │                                                                        │
 │   Reads:  bundle.duckdb  +  design.json                                │
 │   Writes: model.bin, model.schema.json, backtest.json                  │
 └────────────────────────────────────────────────────────────────────────┘
                 │
                 ▼
       qlm.qwery.relml  (the RelML Python package — see relml.md)
```

The control flow for a single training run:

1. Browser POSTs `description + metadata` to `/api/ml-tasks/design/clarify`. Agent either returns MCQs or a `design`.
2. Server validates the `design.task_sql` against an in-memory DuckDB whose schema mirrors the source datasource (catches binder errors before training).
3. Server runs *semantic* validation (FK casts, leakage, capacity vs. row count, etc.).
4. Browser POSTs the validated design to `/api/ml-tasks/train`.
5. Server creates a per-job directory under `${QWERY_STORAGE_DIR}/ml/<jobId>/`.
6. Server pulls every table referenced by `dataset_schema` from the source datasource, materializes them into `bundle.duckdb`, then writes `design.json` (with empty-string `pk` rewritten to `null` for the C++ bindings).
7. Server `Bun.spawn`s `python3 python/train_cli.py --bundle … --design …`. stdout/stderr stream back over SSE; lines are captured to `train.log`.
8. On success, server runs `backtest_cli.py` (when configured), then computes a structured diagnosis from `train.log` + `backtest.json`.
9. UI subscribes to `/api/ml-tasks/train/:id/stream` and renders metrics + the diagnosis.
10. `/predict` endpoint short-spawns `predict_cli.py` for each inference call.

---

## 2. What was added — file inventory

Group these into **`Domain`**, **`Agent SDK`**, **`Server`**, **`Web`**, **`Python`**, **`Tests`**.

### Domain (`packages/domain/src/entities/`)

| File | Lines | Purpose |
|------|------|---------|
| `ml-task.type.ts` | 505 | All Zod schemas + TS types for the integration: `MLTaskDesign`, `MLInferenceSchema`, `MLDatasetSchema`, `MLHyperparameters`, `MLTrainingJob`, `MLBacktestSpec`, `MLClarifyResponse`, `MLImprovementProposal`, `MLTrainingDiagnosis`, `MLFinalMetrics`, `MLTrainLogEvent`, `MLTaskSuggestion`. |

### Agent SDK (`packages/agent-factory-sdk/src/services/`)

| File | Lines | Purpose |
|------|------|---------|
| `suggest-ml-tasks.service.ts` | 138 | Schema-grounded "what could you predict here" suggestions. |
| `clarify-ml-task.service.ts` | 219 | First pass: returns MCQs OR `ready=true`. Includes `mergeAnswersIntoDescription`. |
| `design-ml-task.service.ts` | 616 | Main design agent. Builds a long, schema-aware prompt; uses `generateObject` against a Zod schema; supports retry-with-feedback. |
| `improve-ml-task.service.ts` | 410 | Improvement & recovery agent. Reads the lineage of prior runs + the diagnosis + (optionally) the captured stderr, returns an `MLImprovementProposal`. |
| `relml-primer.ts` | 61 | Compact technical primer about RelML (architecture, routing, common failure modes) — embedded into design + improve prompts. |
| `diagnosis-playbook.ts` | 119 | Lever-by-lever guidance the improver leans on (overfitting, underfitting, instability, etc.). |
| `schema-digest.ts` | 203 | Compresses `DatasourceMetadata` into a token-efficient prompt block. |

### Server lib (`apps/server/src/lib/ml/`)

| File | Lines | Purpose |
|------|------|---------|
| `quote-ident.ts` | 15 | ANSI-quoted identifier escape, schema-prefix aware. |
| `validate-design.ts` | 275 | EXPLAIN-based SQL binder validation against a phantom DuckDB; produces `autoFixCandidates` for known-repairable errors. |
| `validate-task-design.ts` | 419 | Semantic validation: leakage checks, FK-cast-to-VARCHAR check, capacity vs. row count, target-column-exists, etc. |
| `normalize-design.ts` | 152 | Strips schema prefixes from `dataset_schema` keys + `task_sql`; `serializeDesignForPython` rewrites empty-string PKs to `null` for the RelML C++ binding. |
| `bundle-builder.ts` | 462 | Reads each declared source table via the qwery driver, infers DuckDB types, writes a `.duckdb` bundle, computes the backtest cutoff. |
| `job-manager.ts` | 668 | Per-job lifecycle: spawn, log buffer, stderr ring buffer, SSE subscription, on-disk persistence (`job.json`), `restoreJobsFromDisk`, lineage. |
| `parse-metrics.ts` | 148 | Re-parses the trainer's per-epoch metrics table from `train.log`. |
| `compute-diagnosis.ts` | 638 | Computes structured diagnosis (curve shape, gap evolution, tail slope, leakage suspicion, etc.) post-training. |
| `predict.ts` | 126 | Validates inputs against the inference schema, then spawns `predict_cli.py`. |

### Server route (`apps/server/src/routes/`)

| File | Lines | Purpose |
|------|------|---------|
| `ml-tasks.ts` | 913 | The full Hono router for `/api/ml-tasks`: `suggest`, `design`, `design/clarify`, `train`, `train/:id`, `train/:id/stream` (SSE), `train/:id/cancel`, `train/:id/improve`, `train/:id/recover`, `train/:id/predict`, `train/:id/backtest`, `train/by-datasource/:dsId`. |

### Web (`apps/web/`)

| File | Lines | Purpose |
|------|------|---------|
| `app/routes/datasource/model-builder.tsx` | 408 | Top-level route; orchestrates the 4-step state machine. |
| `app/routes/datasource/_components/model-builder/builder-header.tsx` | 89 | Header bar. |
| `app/routes/datasource/_components/model-builder/builder-stepper.tsx` | 96 | Steps 1-4 stepper. |
| `app/routes/datasource/_components/model-builder/animated-logo.tsx` | 333 | Decorative branded logo. |
| `app/routes/datasource/_components/model-builder/design-animation.tsx` | 198 | "Design in progress" loading animation. |
| `app/routes/datasource/_components/model-builder/clarify-questions.tsx` | 132 | Renders the agent's MCQ panel. |
| `app/routes/datasource/_components/model-builder/step-describe.tsx` | 205 | Step 1: textarea + suggestions + clarify panel. |
| `app/routes/datasource/_components/model-builder/step-design.tsx` | 213 | Step 2: shows the design + lets user tweak hyperparams. |
| `app/routes/datasource/_components/model-builder/step-train.tsx` | 70 | Step 3 entry. |
| `app/routes/datasource/_components/model-builder/step-use.tsx` | 48 | Step 4 entry. |
| `app/routes/datasource/_components/model-builder/training-panel.tsx` | 244 | Live SSE log + cancel button. |
| `app/routes/datasource/_components/model-builder/metrics-charts.tsx` | 428 | Recharts (or equivalent) plots of per-epoch metrics. |
| `app/routes/datasource/_components/model-builder/improve-panel.tsx` | 548 | Diagnosis + diff viewer + retrain button. |
| `app/routes/datasource/_components/model-builder/inference-panel.tsx` | 186 | Form generated from the inference schema. |
| `app/routes/datasource/_components/model-builder/inference-schema-editor.tsx` | 250 | Edit the inference schema before training. |
| `app/routes/datasource/_components/model-builder/hyperparameters-editor.tsx` | 53 | Hyperparameter form. |
| `app/routes/datasource/_components/model-builder/backtest-panel.tsx` | 188 | Held-out window result table + chart. |
| `app/routes/datasource/_components/model-builder/backtest-input.tsx` | 87 | Set `holdout_rows`. |
| `app/routes/datasource/_components/model-builder/preview-grid.tsx` | 61 | First N rows of the materialized task table. |
| `app/routes/datasource/_components/model-builder/schema-digest.tsx` | 82 | Inline schema preview. |
| `app/routes/datasource/_components/model-builder/schema-sheet.tsx` | 60 | Side sheet listing the current dataset schema. |
| `app/routes/datasource/_components/model-builder/model-summary.tsx` | 70 | "Model X: <type>, <metric>" summary card. |
| `app/routes/datasource/_components/model-builder/trained-models-list.tsx` | 90 | Lineage of training jobs. |
| `lib/repositories/ml-tasks-client.ts` | 287 | Typed client for every `/api/ml-tasks` endpoint, plus `subscribeToTrainingLogs(jobId, handlers)` that opens an SSE `EventSource`. |
| `lib/services/run-datasource-query.ts` | 71 | Run a SQL string against the user's datasource (used by the preview grid). |

### Python (`python/`)

| File | Lines | Purpose |
|------|------|---------|
| `train_cli.py` | 172 | Reads `--bundle` + `--design`, calls `relml.train()`, writes `--out-model` + `--out-schema`. Honors `design.backtest.cutoff` by filtering the train SQL. |
| `predict_cli.py` | 208 | Reads `--bundle` + `--design` + `--model` + `--input` (JSON), calls `relml.load_model().predict(...)`, prints a single JSON line. Converts ISO date inputs to local-time unix-seconds. |
| `backtest_cli.py` | 362 | Reloads the model with the FULL task SQL, walks every held-out row, calls `predict()`, writes per-row + aggregate metrics to `--out`. |
| `convert_data.py` | 32 | One-shot helper: download MovieLens-1M, push to local Postgres. |
| `load_relbench_ratebeer.py` | 253 | One-shot helper: load the RelBench rel-ratebeer dataset into Postgres. |

### Tests (`apps/server/__tests__/lib/`)

| File | Lines | Purpose |
|------|------|---------|
| `compute-diagnosis.test.ts` | 227 | Diagnosis curve-shape and threshold tests. |
| `validate-task-design.test.ts` | 340 | Semantic validation tests. |

---

## 3. What was modified — diff inventory

Every change below is required for the integration to function end-to-end.

### `apps/server/package.json`

```json
"dependencies": {
  ...,
  "@duckdb/node-api": "1.4.2-r.1",  // bundle-builder + validate-design need it
  ...
}
```

### `apps/server/src/index.ts`

Add the `restoreJobsFromDisk()` call so that jobs survive a server restart and any in-flight job is reconciled to `failed`:

```ts
import { restoreJobsFromDisk } from './lib/ml/job-manager';
…
const extensionsCount = ExtensionsRegistry.list(ExtensionScope.DATASOURCE).length;
logger.info(`Discovered ${extensionsCount} datasource extensions`);

await restoreJobsFromDisk();   // ← added

const app = createApp();
```

### `apps/server/src/server.ts`

Mount the new router:

```ts
import { createMlTasksRoutes } from './routes/ml-tasks';
…
api.route('/notebook/query', createNotebookQueryRoutes(getRepositories));
api.route('/ml-tasks', createMlTasksRoutes(getRepositories));   // ← added
api.route('/usage', createUsageRoutes(getRepositories));
```

### `apps/server/tsconfig.json`

Decorator metadata is required by some runtime libs the agent SDK pulls in:

```json
{
  "compilerOptions": {
    ...,
    "esModuleInterop": true,
    "experimentalDecorators": true,    // ← added
    "emitDecoratorMetadata": true      // ← added
  }
}
```

### `apps/web/package.json`

```json
"dependencies": {
  ...,
  "lucide-react": "^0.552.0",
  "motion": "^12.23.24",       // animated-logo + design-animation
  ...
}
```

### `apps/web/app/routes.ts`

```ts
const datasourceLayout = layout('routes/datasource/layout.tsx', [
  route('ds/:slug', 'routes/datasource/index.tsx'),
  route('ds/:slug/tables', 'routes/datasource/tables.tsx'),
  route('ds/:slug/tables/:schema/:tableName', 'routes/datasource/table.tsx'),
  route('ds/:slug/schema', 'routes/datasource/schema.tsx'),
  route('ds/:slug/settings', 'routes/datasource/settings.tsx'),
  route('ds/:slug/model-builder', 'routes/datasource/model-builder.tsx'), // ← added
]);
```

### `apps/web/config/datasource.navigation.config.tsx`

```tsx
import { Brain, Database, Home, Settings, Table } from 'lucide-react';
…
{
  label: 'common:routes.datasourceModelBuilder',
  path: createPath(pathsConfig.app.datasourceModelBuilder, slug),
  Icon: <Brain className={iconClasses} />,
  end: true,
},
```

### `apps/web/config/paths.config.ts`

```ts
const PathsSchema = z.object({
  ...,
  datasourceSchema: z.string().min(1),
  datasourceTables: z.string().min(1),
  datasourceSettings: z.string().min(1),
  datasourceModelBuilder: z.string().min(1),   // ← added
});

const pathsConfig = PathsSchema.parse({
  ...,
  datasourceSchema: '/ds/[slug]/schema',
  datasourceTables: '/ds/[slug]/tables',
  datasourceSettings: '/ds/[slug]/settings',
  datasourceModelBuilder: '/ds/[slug]/model-builder', // ← added
});
```

### `apps/web/lib/i18n/locales/en/common.json`

```json
"routes": {
  ...,
  "datasourceSettings": "Settings",
  "datasourceModelBuilder": "Model Builder",   // ← added
  ...
}
```

### `packages/agent-factory-sdk/src/services/index.ts`

Re-export everything new:

```ts
export * from './design-ml-task.service';
export * from './clarify-ml-task.service';
export * from './improve-ml-task.service';
export * from './relml-primer';
export * from './diagnosis-playbook';
export * from './suggest-ml-tasks.service';
export * from './schema-digest';
```

### `packages/domain/src/entities/index.ts`

```ts
export * from './ml-task.type';
```

### `packages/extensions-sdk/src/metadata-builder.ts`

`buildMetadataFromInformationSchema` now accepts an optional `rowCounts: Map<string, number>` keyed by `${schema}.${table_name}`. When supplied, the per-table `live_rows_estimate` is populated from the map instead of being hard-coded to `0`. The design agent uses this to make capacity-vs-size decisions (small datasets get smaller `channels`, larger dropout, etc.).

### `packages/extensions/postgresql/src/driver.ts`

Two changes — both feed the agent better metadata:

1. **OID → type-name map**: a 23-entry `PG_TYPE_BY_OID` lookup so result-set columns expose human-readable `originalType` and a normalized `type` field (`integer`, `string`, `timestamp`, `uuid`, …). The bundle-builder relies on this to infer DuckDB types from the source data without value-sniffing.
2. **Cheap row-count estimates**: an extra query against `pg_class.reltuples` runs per metadata refresh. Rows are loaded into a `Map`, passed into `buildMetadataFromInformationSchema({ rowCounts })`. Falls back to `0` for any table that has never been ANALYZE'd.

### `pnpm-lock.yaml`

`@duckdb/node-api@1.4.2-r.1` and `motion@^12.23.24` resolutions are added. Re-run `pnpm install` to regenerate.

---

## 4. Prerequisites

- Node 20+, **Bun** ≥ 1.1 (the server runs on Bun, not Node).
- pnpm 9+ (workspace tooling).
- Python 3.9+ on PATH as `python3` (or any path passed via `QWERY_PYTHON_BIN`).
- A C++20 compiler + CMake ≥ 3.20 (required by RelML's compiled core — see `relml.md` §2).
- A PostgreSQL datasource the user can register in qwery (or any datasource whose driver implements the standard query / metadata interface; the bundle-builder works with any node-runtime driver, but only `postgresql` ships the row-count + OID-typed metadata in this integration).
- An LLM provider configured for the agent SDK (OpenAI, Azure, or any compatible). The agent uses `generateObject` from the `ai` package; whichever model is wired into `getDefaultModel()` will be used unless the route is called with an explicit `model` field.

---

## 5. Step 1 — Install runtime dependencies

From the repo root:

```bash
# server
pnpm --filter @qwery/server add @duckdb/node-api@1.4.2-r.1

# web
pnpm --filter @qwery/web add motion@^12.23.24

# refresh the lockfile if needed
pnpm install
```

These are the only two new JS deps. Everything else uses packages already present in the workspace.

---

## 6. Step 2 — Add domain types (`@qwery/domain`)

Create `packages/domain/src/entities/ml-task.type.ts` and copy the entire file from this repo. Key types and why each exists:

| Type | Purpose |
|------|---------|
| `MLTaskType` | `binary_classification` / `regression` / `multiclass_classification`. |
| `MLLabelTransform` | Discriminated union: `{kind:'threshold'…}` / `{kind:'normalize'}` / `{kind:'buckets', buckets}`. |
| `MLInferenceField` | Schema field with `role: 'entity_key' \| 'temporal_key' \| 'context'`, `type`, `references`, `description`. |
| `MLInferenceSchema` | The agent-facing contract — what an inference call accepts and what the model returns. |
| `MLDatasetSchema` | `Record<table, { pk, fks: [{column, references}] }>`. |
| `MLHyperparameters` | `channels`, `gnn_layers`, `hidden`, `dropout`, `lr`, `epochs`, `batch_size`. |
| `MLTaskDesign` | The whole design payload: `task_sql`, `task_table_name`, `target_column`, `task_type`, `label_transform`, `split_strategy`, `time_col`, `dataset_schema`, `inference_schema`, `hyperparameters`, optional `backtest`. |
| `MLTrainingJob` | Persisted job record (status, `modelPath`, `schemaPath`, `parentJobId`, `description`, `clarifyAnswers`, `finalMetrics`, `diagnosis`, `backtestStatus`, `backtestResultPath`). |
| `MLTrainingDiagnosis` | Flags + numeric evidence (val/train ratio, val curve shape, gap evolution, backtest R², …). |
| `MLClarifyResponse` | `{ready: true, design}` or `{ready: false, questions}`. |
| `MLImprovementProposal` | What `/improve` and `/recover` return. |
| `MLBacktestResult` | `{cutoff, rows, metrics: {count, mae, rmse, r2}}`. |
| `MLTrainLogEvent` | SSE event shape: `{type:'log', line}` or `{type:'status', status, error?}`. |
| `MLTaskSuggestion` | What `/suggest` returns to seed the Describe step. |

Re-export from `packages/domain/src/entities/index.ts`:

```ts
export * from './ml-task.type';
```

These types **must live in `@qwery/domain`** — the server, the agent SDK, the web client, and the route validators all import them from a single place. Do not duplicate them.

---

## 7. Step 3 — Extend the extensions SDK with `rowCounts`

In `packages/extensions-sdk/src/metadata-builder.ts`, augment `BuildMetadataOptions` and `buildMetadataFromInformationSchema`:

```ts
export interface BuildMetadataOptions {
  driver: …;
  rows: InformationSchemaRow[];
  primaryKeys?: PrimaryKeyRow[];
  foreignKeys?: ForeignKeyRow[];
  /** Map<`${schema}.${table_name}`, estimated rows>. Drivers omit if expensive. */
  rowCounts?: Map<string, number>;
}

export function buildMetadataFromInformationSchema(options) {
  const { driver, rows, primaryKeys = [], foreignKeys = [], rowCounts } = options;
  …
  // when emitting each Table:
  const liveRows = rowCounts?.get(`${table.schema}.${table.name}`) ?? 0;
  return { …, live_rows_estimate: liveRows, … };
}
```

This is consumed by `validateTaskDesign`, the schema digest, and the design prompt. Tables that report `0` will be flagged by the validator if the agent picks an oversized `channels`/`hidden` for what's effectively an empty table.

---

## 8. Step 4 — Upgrade the PostgreSQL driver (types + row counts)

In `packages/extensions/postgresql/src/driver.ts`:

### 8.1 Add the OID map

```ts
const PG_TYPE_BY_OID: Record<number, { name: string; type: ColumnTypeAlias }> = {
  16: { name: 'bool',      type: 'boolean' },
  17: { name: 'bytea',     type: 'binary' },
  18: { name: 'char',      type: 'string' },
  19: { name: 'name',      type: 'string' },
  20: { name: 'int8',      type: 'integer' },
  21: { name: 'int2',      type: 'integer' },
  23: { name: 'int4',      type: 'integer' },
  25: { name: 'text',      type: 'string' },
  114: { name: 'json',     type: 'json' },
  142: { name: 'xml',      type: 'string' },
  700: { name: 'float4',   type: 'float' },
  701: { name: 'float8',   type: 'float' },
  790: { name: 'money',    type: 'decimal' },
  1042: { name: 'bpchar',  type: 'string' },
  1043: { name: 'varchar', type: 'string' },
  1082: { name: 'date',    type: 'date' },
  1083: { name: 'time',    type: 'time' },
  1114: { name: 'timestamp',   type: 'timestamp' },
  1184: { name: 'timestamptz', type: 'timestamp' },
  1266: { name: 'timetz',  type: 'time' },
  1700: { name: 'numeric', type: 'decimal' },
  2950: { name: 'uuid',    type: 'uuid' },
  3802: { name: 'jsonb',   type: 'jsonb' },
};
```

### 8.2 Use it from `collectColumns`

```ts
const collectColumns = (fields) =>
  fields.map((field) => {
    const info = PG_TYPE_BY_OID[field.dataTypeID];
    return {
      name: field.name,
      displayName: field.name,
      originalType: info?.name ?? String(field.dataTypeID),
      type: info?.type ?? 'unknown',
    };
  });
```

### 8.3 Add the row-count query in the metadata fetcher

```ts
const rowCountRows = await withClient({ connectionUrl }, async (client) => {
  const result = await client.query<{
    schemaname: string;
    tablename: string;
    reltuples: string;
  }>(`
    SELECT n.nspname AS schemaname,
           c.relname AS tablename,
           GREATEST(c.reltuples, 0)::bigint::text AS reltuples
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p')
      AND n.nspname NOT IN ('information_schema', 'pg_catalog');
  `);
  return result.rows;
});
const rowCounts = new Map<string, number>();
for (const r of rowCountRows) {
  const n = Number.parseInt(r.reltuples, 10);
  if (Number.isFinite(n)) {
    rowCounts.set(`${r.schemaname}.${r.tablename}`, n);
  }
}
```

### 8.4 Pass `rowCounts` to the metadata builder

```ts
return buildMetadataFromInformationSchema({
  driver,
  rows,
  primaryKeys: primaryKeyRows as PrimaryKeyRow[],
  foreignKeys: foreignKeyRows as ForeignKeyRow[],
  rowCounts,
});
```

For other drivers (MySQL, ClickHouse, …), the same pattern applies — supply `rowCounts` if the underlying engine has cheap estimates, otherwise omit.

---

## 9. Step 5 — Add agent services (`@qwery/agent-factory-sdk`)

Create the seven files under `packages/agent-factory-sdk/src/services/`:

| File | What it exports | What it does |
|------|-----------------|--------------|
| `relml-primer.ts` | `RELML_PRIMER: string` | A ~60-line technical primer pasted into the design and improve prompts. Tells the agent exactly how `predict()` routes, what hyperparameters control, and which failure modes are SQL-only fixes. |
| `diagnosis-playbook.ts` | `DIAGNOSIS_PLAYBOOK: string` | Lever-by-lever guidance keyed by diagnosis flag. Read by the improver. |
| `schema-digest.ts` | `buildSchemaDigest(metadata, opts)` | Compresses `DatasourceMetadata` (tables, columns, PKs, FKs, row counts) into a token-efficient string. Used by every agent service. |
| `suggest-ml-tasks.service.ts` | `suggestMLTasks({ metadata, model? })` | Returns 3-6 plain-English `MLTaskSuggestion` items the user can click in Step 1. |
| `clarify-ml-task.service.ts` | `clarifyMLTask({ description, metadata, answers?, model? })`, `mergeAnswersIntoDescription(description, answers)` | First-pass agent. Returns either MCQs or `ready=true`. |
| `design-ml-task.service.ts` | `designMLTask({ description, metadata, model?, previousError? })` | Builds and returns a fully-typed `MLTaskDesign`. Embeds the primer; supports retry-with-feedback through the `previousError` arg. |
| `improve-ml-task.service.ts` | `improveMLTask({ description, metadata, lineage, clarifyAnswers, model?, previousError?, runtimeError? })` | Reads the lineage of prior runs, the diagnosis, and (optionally) a captured stderr tail; returns `MLImprovementProposal`. Same agent powers `/improve` and `/recover` — `runtimeError` is what differentiates them. |

Re-export them from `packages/agent-factory-sdk/src/services/index.ts`. The core SDK already re-exports `services/*` from its public entry, so consumers get them via:

```ts
import {
  clarifyMLTask, designMLTask, improveMLTask,
  mergeAnswersIntoDescription, suggestMLTasks,
  RELML_PRIMER, DIAGNOSIS_PLAYBOOK, buildSchemaDigest,
} from '@qwery/agent-factory-sdk';
```

Each service follows the same shape: build a prompt → call `generateObject({ model, schema, prompt })` from `ai` → return the typed object → wrap in a timeout (60-120s).

---

## 10. Step 6 — Add server library (`apps/server/src/lib/ml`)

Create `apps/server/src/lib/ml/` and add nine files. Brief responsibilities:

### `quote-ident.ts`

ANSI double-quote escape. Handles bare and dotted (`schema.table`) names. Used by every other lib file that builds SQL.

### `validate-design.ts` — `validateTaskSql(sql, metadata)` + `autoFixCandidates(sql, error)`

Boots an in-memory DuckDB, creates an empty phantom table per `metadata.tables`, runs `EXPLAIN <sql>`. Returns `{ok: true}` or `{ok: false, error}`. `autoFixCandidates` returns deterministic patches for common errors (e.g. `ON x = x` → drop the join). The route loops up to `MAX_AUTO_FIX_DEPTH = 3` retries, recursing on each patched SQL.

### `validate-task-design.ts` — `validateTaskDesign(design, metadata)`

Runs after the SQL passes binder validation. Checks:

- Target column exists in the projected SELECT list.
- No FK column was projected as VARCHAR via `CAST` (would break GNN edges).
- No leakage: window frames must end at `1 PRECEDING`, never `CURRENT ROW`.
- Capacity sanity: `channels × hidden` against `live_rows_estimate` of the dominant table.
- `task_table_name` doesn't collide with a real table in the schema.

Returns `{ok: true} | {ok: false, feedback, violations}`. The `feedback` string is fed back into the design agent as `previousError` for the next attempt.

### `normalize-design.ts` — `normalizeDesignForBundle(design)` + `serializeDesignForPython(design)`

`normalizeDesignForBundle` strips schema prefixes from `dataset_schema` keys and from every `<schema>.<table>` reference inside `task_sql` (longest-name-first to avoid `dim_date_lookup` matching `dim_date`). Returns the rewritten design AND a `sourceTablesByLocalName: Map<string, string>` so the bundle-builder knows how to fetch each table from the source.

`serializeDesignForPython` JSON-serialises the design with one critical rewrite: any `dataset_schema[t].pk === ''` becomes `null`. RelML's C++ binding tests `is_none()` on `pkey_col`, and `""` would coerce to a non-empty optional and silently break FK-target resolution.

### `bundle-builder.ts` — `buildTrainingBundle({ datasource, design, bundlePath, logLine })`

1. Resolves the datasource's driver (must have `runtime === 'node'`).
2. For each `[localName, sourceName]` in the normalized map: `SELECT * FROM "<sourceName>"`.
3. Infers DuckDB column type from the column metadata (`originalType` first — that's why the PG OID map matters), with a value-sniffing fallback.
4. `CREATE TABLE` in the bundle DuckDB; appender-batches every row. **DATE columns are stored as TIMESTAMP at UTC midnight** of the LOCAL y/m/d the driver returned, so the predict-time ISO date parsing matches.
5. If `design.backtest && design.split_strategy === 'temporal'`, runs the task SQL inside the bundle and computes the inclusive cutoff: the `(holdout_rows + 1)`-th newest distinct value of `time_col`. Returns it.

### `job-manager.ts` — the job lifecycle

Exposes `startTrainingJob`, `getTrainingJob`, `listTrainingJobsForDatasource`, `cancelTrainingJob`, `subscribeToJob`, `getLineage`, `getJobPaths`, `restoreJobsFromDisk`.

Runtime per job:
- A `Map<jobId, RuntimeJob>` in memory.
- A `RuntimeJob` holds `meta`, `logBuffer: string[]`, `stderrBuffer: string[]` (last 200 lines, used by `/recover`), a `Set<JobListener>`, the active `Bun.Subprocess`, and a `cancelled` flag.
- Status transitions persist to `${jobDir}/job.json` immediately. `restoreJobsFromDisk()` rebuilds the in-memory map at startup; jobs that were `running` get reconciled to `failed` with `error: "Server restarted while training was in progress…"`.
- Lineage walks `parentJobId` back to root. Used by `/improve` to give the agent every prior attempt.
- After Python exits 0:
  - If `design.backtest.cutoff` was computed, spawn `backtest_cli.py`.
  - Compute the structured diagnosis from `train.log` + `backtest.json`.
  - Only THEN flip status to `succeeded` — clients can rely on `succeeded` meaning "diagnosis is ready".

### `predict.ts` — `runPrediction({ job, bundlePath, designPath, modelPath, inputs })`

Validates `inputs` against `job.design.inference_schema` (missing required → fail; unknown fields → fail), spawns `predict_cli.py`, parses the trailing JSON line of stdout. Returns `{ok, value?, error?}`.

### `parse-metrics.ts` — `parseMetricsFromLog(logText)` + `bestForKey`, `inferDirection`, `stddev`

Re-parses the trainer's per-epoch metrics table (header + rows separated by `|`). Used for both diagnosis computation and the in-UI live chart.

### `compute-diagnosis.ts` — `computeDiagnosis({ logPath, backtestResultPath, design })`

Reads `train.log`, parses metrics, computes:
- `valCurveShape` over the last 20% of epochs (`descending` / `plateau` / `rising` / `oscillating`).
- `gapEvolution` (`growing` / `shrinking` / `stable`).
- `valTailRelSlope`.
- Best val epoch position (`bestEpochPosition` ∈ [0,1]).
- Backtest R² / RMSE / MAE if the backtest JSON is present.
- A list of `MLTrainingDiagnosisFlag`s and a plain-English `summary`.

Returns `{ finalMetrics, diagnosis }`.

---

## 11. Step 7 — Mount the `/api/ml-tasks` HTTP routes

Create `apps/server/src/routes/ml-tasks.ts`. The router is a `Hono()` instance with these endpoints — copy the file verbatim from this repo:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/suggest` | `suggestMLTasks(metadata)` → `{suggestions}`. |
| `POST` | `/design/clarify` | Clarify pass: returns either MCQs or a fully-validated design (one round of clarification, then auto-design). |
| `POST` | `/design` | Direct design (skipping clarify). Retries up to 4× with binder + semantic feedback. |
| `POST` | `/train` | Spawn a training job. Returns the `MLTrainingJob` immediately. |
| `GET`  | `/train/by-datasource/:datasourceId` | List jobs for a datasource. |
| `GET`  | `/train/:jobId` | Fetch one job. |
| `POST` | `/train/:jobId/improve` | Run the improvement agent on a successful run. |
| `POST` | `/train/:jobId/recover` | Run the improvement agent on a failed run with the captured stderr. |
| `POST` | `/train/:jobId/cancel` | Send `SIGTERM` to the running Python subprocess. |
| `POST` | `/train/:jobId/predict` | Validate inputs against the schema and run inference. |
| `GET`  | `/train/:jobId/backtest` | Read `backtest.json` from disk. |
| `GET`  | `/train/:jobId/stream` | SSE stream of log + status events. |

Then mount it in `apps/server/src/server.ts`:

```ts
import { createMlTasksRoutes } from './routes/ml-tasks';
…
api.route('/ml-tasks', createMlTasksRoutes(getRepositories));
```

The route depends on:
- `getRepositories` (already present in this codebase) for `GetDatasourceService` / `GetDatasourceBySlugService`.
- `handleDomainException` and `isUUID` from `apps/server/src/lib/http-utils` (existing).
- `streamSSE` from `hono/streaming` (Hono ships it).
- `@hono/zod-validator` (already a dependency).

---

## 12. Step 8 — Wire startup (`restoreJobsFromDisk`)

In `apps/server/src/index.ts`, before `createApp()`:

```ts
import { restoreJobsFromDisk } from './lib/ml/job-manager';
…
await restoreJobsFromDisk();
const app = createApp();
```

This makes the in-memory job registry survive a server restart. Without it, `GET /train/:id` returns 404 for every prior job after a restart.

---

## 13. Step 9 — Add the Python CLIs

Create `python/` at the repo root and drop in the three CLIs. They are intentionally vanilla and self-contained — they read CLI flags, import `qlm.qwery.relml`, and produce the documented outputs. **The full source of all three is embedded below**, so this section is the spec.

### 13.1 The contract between the server and each CLI

| | `train_cli.py` | `backtest_cli.py` | `predict_cli.py` |
|---|---|---|---|
| Spawned by | `job-manager.startTrainingJob` | `job-manager.runBacktest` (after train succeeds, when `design.backtest.cutoff` is set) | `predict.runPrediction` (per HTTP `POST /predict`) |
| Required args | `--bundle --design --out-model --out-schema` | `--bundle --design --model --out` | `--bundle --design --model --input '<json>'` |
| Reads | `bundle.duckdb`, `design.json` | `bundle.duckdb`, `design.json`, `model.bin` | `bundle.duckdb`, `design.json`, `model.bin`, `--input` JSON |
| Writes | `model.bin`, `model.schema.json` | `backtest.json` | nothing — prints one JSON line on stdout |
| stdout convention | Free-form log lines prefixed `[train_cli]` plus the trainer's per-epoch metrics table | Free-form log lines prefixed `[backtest_cli]` | Exactly one JSON object on the last line — `{"ok": true, "value": …}` or `{"ok": false, "error": "…"}` |
| Exit codes | `0` success / `1` runtime / `2` bad arg / `3` missing dep / `130` SIGINT | same | same |
| `PYTHONUNBUFFERED=1` | yes (set by `Bun.spawn`) | yes | yes |

### 13.2 `python/train_cli.py` — full source

```python
#!/usr/bin/env python3
"""
RelML training CLI. Invoked by the qwery server as a subprocess.

Inputs:
  --bundle      Path to a DuckDB file with source tables loaded into `main`.
  --design      Path to a JSON file matching the MLTaskDesign contract.
  --out-model   Where to save the trained weights (.bin).
  --out-schema  Where to save the inference-schema sidecar (.json).

Output:
  Human-readable progress on stdout (captured by the server), model files on
  disk, exit code 0 on success / non-zero on failure.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import traceback
from pathlib import Path


def log(msg: str) -> None:
    print(f"[train_cli] {msg}", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Train a RelML model")
    parser.add_argument("--bundle", required=True, help="Path to DuckDB bundle")
    parser.add_argument("--design", required=True, help="Path to design JSON")
    parser.add_argument("--out-model", required=True, help="Path to write model.bin")
    parser.add_argument("--out-schema", required=True, help="Path to write schema.json")
    args = parser.parse_args()

    design_path = Path(args.design)
    bundle_path = Path(args.bundle)
    out_model = Path(args.out_model)
    out_schema = Path(args.out_schema)

    if not design_path.is_file():
        log(f"ERROR: design file not found: {design_path}")
        return 2
    if not bundle_path.is_file():
        log(f"ERROR: bundle file not found: {bundle_path}")
        return 2

    log(f"loading design from {design_path}")
    design = json.loads(design_path.read_text())

    log("importing dependencies")
    try:
        import duckdb
    except ImportError as e:
        log(f"ERROR: duckdb not installed ({e}). Run: pip install duckdb")
        return 3
    try:
        import qlm.qwery.relml as relml
        from qlm.qwery.relml import (
            TaskSpec,
            InferenceField,
            InferenceOutput,
            InferenceSchema,
        )
    except ImportError as e:
        log(f"ERROR: RelML not installed ({e}). See relml.md for install steps.")
        return 3

    inputs_cfg = design["inference_schema"]["inputs"]
    output_cfg = design["inference_schema"]["output"]
    inference_schema = InferenceSchema(
        inputs=[
            InferenceField(
                field=f["field"],
                role=f["role"],
                type=f["type"],
                required=bool(f.get("required", True)),
                references=f.get("references", ""),
                description=f.get("description", ""),
            )
            for f in inputs_cfg
        ],
        output=InferenceOutput(
            type=output_cfg["type"],
            description=output_cfg.get("description", ""),
            num_classes=int(output_cfg.get("num_classes", 0) or 0),
        ),
    )

    # If a backtest cutoff was set by the server, exclude the held-out
    # window from training. Wrap the original task_sql in a CTE and filter.
    raw_task_sql = design["task_sql"]
    backtest = design.get("backtest") or {}
    cutoff = backtest.get("cutoff")
    time_col = design.get("time_col", "")
    if cutoff and time_col:
        log(f"applying backtest cutoff: training on {time_col} <= '{cutoff}'")
        train_task_sql = (
            f"WITH __orig__ AS ({raw_task_sql.rstrip(';').rstrip()}) "
            f'SELECT * FROM __orig__ WHERE "{time_col}" <= '
            f"CAST('{cutoff}' AS TIMESTAMP) "
            f'ORDER BY "{time_col}"'
        )
    else:
        train_task_sql = raw_task_sql

    task = TaskSpec(
        sql=train_task_sql,
        task_table_name=design["task_table_name"],
        target_column=design["target_column"],
        task_type=design["task_type"],
        label_transform=design["label_transform"],
        split_strategy=design.get("split_strategy", "random"),
        time_col=time_col,
        dataset_schema=design["dataset_schema"],
        inference_schema=inference_schema,
    )

    hp = design["hyperparameters"]
    log(f"connecting to bundle: {bundle_path}")
    conn = duckdb.connect(str(bundle_path))

    log(
        f"starting training: task_type={design['task_type']}, "
        f"epochs={hp['epochs']}, channels={hp['channels']}, "
        f"gnn_layers={hp['gnn_layers']}"
    )
    t0 = time.time()
    try:
        model = relml.train(
            conn=conn,
            task=task,
            channels=int(hp["channels"]),
            gnn_layers=int(hp["gnn_layers"]),
            hidden=int(hp["hidden"]),
            dropout=float(hp["dropout"]),
            lr=float(hp["lr"]),
            epochs=int(hp["epochs"]),
            batch_size=int(hp["batch_size"]),
        )
    except Exception as e:
        log(f"ERROR: training failed: {e}")
        traceback.print_exc()
        return 1

    elapsed = time.time() - t0
    log(f"training complete in {elapsed:.1f}s")

    out_model.parent.mkdir(parents=True, exist_ok=True)
    out_schema.parent.mkdir(parents=True, exist_ok=True)

    log(f"saving model weights to {out_model}")
    relml.save_model(model, str(out_model))

    log(f"saving inference schema to {out_schema}")
    relml.save_schema(model, str(out_schema))

    log("done")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        log("cancelled by signal")
        sys.exit(130)
    except Exception as e:  # pragma: no cover
        log(f"ERROR: unhandled exception: {e}")
        traceback.print_exc()
        sys.exit(1)
```

**Load-bearing details (don't change without understanding why):**

- The backtest filter is applied **inside the CLI**, not the bundle. Server writes the *original* `task_sql` into `design.json`; the CLI wraps it in `WITH __orig__ AS (…) SELECT * FROM __orig__ WHERE "<time_col>" <= CAST('<cutoff>' AS TIMESTAMP)` so train uses pre-cutoff rows only. `backtest_cli.py` later loads with the *unfiltered* SQL so held-out rows are reachable by `predict()`.
- `rstrip(';').rstrip()` — RelML wraps `task_sql` as `CREATE OR REPLACE TABLE x AS (<sql>)`; a trailing semicolon inside the parens is a parser error.
- `inference_schema` is rebuilt from JSON and attached to the `TaskSpec` before `train()` — RelML's `save_model` does **not** persist the schema; it must be reattached every time.
- Exit `3` for missing deps so the server can distinguish "Python broken" from "Python ran but training failed".

### 13.3 `python/predict_cli.py` — full source

```python
#!/usr/bin/env python3
"""
RelML inference CLI. Invoked by the qwery server as a short-lived subprocess
for each prediction (see relml.md §9 for the call contract).

Inputs:
  --bundle   Path to the DuckDB file that was used at training time.
  --design   Path to the same design.json that was handed to train_cli.
  --model    Path to the saved model.bin.
  --input    JSON object mapping field names (matching inference_schema.inputs)
             to string values.

Output:
  Prints a single JSON line on stdout:
    {"ok": true, "value": <prediction>}       on success
    {"ok": false, "error": "<message>"}       on failure
  Non-zero exit code on failure (so the server can distinguish).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import traceback
from datetime import datetime
from pathlib import Path


ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _stringify(value) -> str:
    """RelML's predict() expects string values; normalize any JSON input."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, bool):
        return "1" if value else "0"
    return str(value)


def _normalize_field(value: str, field_type: str) -> str:
    """
    For date-typed fields, convert ISO YYYY-MM-DD to unix-seconds.

    RelML's internal table loader (qlm.qwery.relml/__init__.py::_load_table)
    calls `datetime.timestamp()` on *naive* datetimes returned by DuckDB —
    which interprets them as **local** time. So a stored "2025-11-26 00:00"
    value becomes epoch-seconds for "2025-11-26 00:00 local", not UTC.

    To match that convention at lookup time, we also parse the input as a
    naive local datetime and call .timestamp() the same way. This sidesteps
    RelML's own ISO date parser which has its own TZ quirks, and passes the
    value as the "unix-seconds integer as a string" form explicitly accepted
    by relml.md §7.5.
    """
    if field_type == "date" and isinstance(value, str) and ISO_DATE_RE.match(value):
        dt = datetime.strptime(value, "%Y-%m-%d")  # naive — interpreted as local
        return str(int(dt.timestamp()))
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description="Predict with a RelML model")
    parser.add_argument("--bundle", required=True)
    parser.add_argument("--design", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument(
        "--input",
        required=True,
        help="JSON object of inference inputs",
    )
    args = parser.parse_args()

    try:
        inputs = json.loads(args.input)
        if not isinstance(inputs, dict):
            raise ValueError("inputs must be a JSON object")
    except Exception as e:
        print(json.dumps({"ok": False, "error": f"Invalid --input JSON: {e}"}))
        return 2

    design_path = Path(args.design)
    bundle_path = Path(args.bundle)
    model_path = Path(args.model)

    if not design_path.is_file():
        print(json.dumps({"ok": False, "error": f"design file missing: {design_path}"}))
        return 2
    if not bundle_path.is_file():
        print(json.dumps({"ok": False, "error": f"bundle file missing: {bundle_path}"}))
        return 2
    if not model_path.is_file():
        print(json.dumps({"ok": False, "error": f"model file missing: {model_path}"}))
        return 2

    try:
        import duckdb  # noqa: F401
        import qlm.qwery.relml as relml
        from qlm.qwery.relml import (
            TaskSpec,
            InferenceField,
            InferenceOutput,
            InferenceSchema,
        )
    except ImportError as e:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": f"RelML or duckdb not installed in this Python: {e}",
                }
            )
        )
        return 3

    design = json.loads(design_path.read_text())

    output_cfg = design["inference_schema"]["output"]
    inference_schema = InferenceSchema(
        inputs=[
            InferenceField(
                field=f["field"],
                role=f["role"],
                type=f["type"],
                required=bool(f.get("required", True)),
                references=f.get("references", ""),
                description=f.get("description", ""),
            )
            for f in design["inference_schema"]["inputs"]
        ],
        output=InferenceOutput(
            type=output_cfg["type"],
            description=output_cfg.get("description", ""),
            num_classes=int(output_cfg.get("num_classes", 0) or 0),
        ),
    )

    task = TaskSpec(
        sql=design["task_sql"],
        task_table_name=design["task_table_name"],
        target_column=design["target_column"],
        task_type=design["task_type"],
        label_transform=design["label_transform"],
        split_strategy=design.get("split_strategy", "random"),
        time_col=design.get("time_col", ""),
        dataset_schema=design["dataset_schema"],
        inference_schema=inference_schema,
    )

    hp = design["hyperparameters"]

    # Build a field_name -> declared_type map so we know when to do
    # ISO-date -> unix-seconds conversion.
    type_by_field = {
        f["field"]: f.get("type", "str")
        for f in design["inference_schema"]["inputs"]
    }

    # Normalize all inputs to strings; then for date-typed fields convert
    # "YYYY-MM-DD" to unix-seconds to side-step RelML's local-time ISO parser.
    normalized_inputs = {
        k: _normalize_field(_stringify(v), type_by_field.get(k, "str"))
        for k, v in inputs.items()
    }

    try:
        import duckdb  # re-import to get the connect function
        conn = duckdb.connect(str(bundle_path))
        model = relml.load_model(
            conn=conn,
            task=task,
            path=str(model_path),
            channels=int(hp["channels"]),
            gnn_layers=int(hp["gnn_layers"]),
            hidden=int(hp["hidden"]),
            dropout=float(hp["dropout"]),
            lr=float(hp["lr"]),
            batch_size=int(hp["batch_size"]),
        )
        value = model.predict(normalized_inputs)
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"ok": False, "error": str(e)}))
        return 1

    # Model.predict returns a float (or class index for multiclass). Coerce
    # bigints / numpy floats to native JSON.
    try:
        if hasattr(value, "item"):
            value = value.item()
        value = float(value)
    except Exception:
        pass

    print(json.dumps({"ok": True, "value": value}))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # pragma: no cover
        print(json.dumps({"ok": False, "error": f"unhandled: {e}"}))
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
```

**Load-bearing details:**

- **Date conversion is non-negotiable.** RelML's internal loader does `datetime.timestamp()` on naive datetimes from DuckDB → interprets them as local. Predict-side must match: parse `YYYY-MM-DD` as naive local and pass unix-seconds. Skip this and predict with a date key returns `no matching row found`.
- The CLI **always** prints exactly one JSON object as the last stdout line — even on argv parse failure. The server reads `lines[-1]`, parses it, and forwards. Every failure path here writes through `print(json.dumps({...}))`, never raw text.
- `hp["batch_size"]` must match what was used at training time. RelML stores no architecture in the weights file; `load_model` rebuilds the architecture from `(channels, gnn_layers, hidden)` and the trainer's encoder, then memcpy's tensors from `model.bin`. Mismatch = silent shape error or wrong predictions.
- The CLI re-creates the `InferenceSchema` from `design.json` and attaches it to the `TaskSpec`. Schema is **not** loaded from `model.schema.json` here — that sidecar exists for external consumers, the server uses the design contract.

### 13.4 `python/backtest_cli.py` — full source

```python
#!/usr/bin/env python3
"""
RelML backtest CLI. Invoked by the qwery server after train_cli succeeds,
when the design has a backtest spec with a populated cutoff.

What it does:
  1. Loads the trained model with the FULL task_sql (no cutoff filter), so
     the held-out rows are present in the task table and predict() can find
     them.
  2. Walks every distinct (entity_keys, time) combination in the held-out
     window (time > cutoff) and calls model.predict() for each.
  3. Reads the actual target value from the task table for each held-out
     combination.
  4. Writes a JSON file shaped like:
        {
          "cutoff": "<iso>",
          "rows": [{ "time": "<iso>", "entity": {...}|null,
                     "actual": <num>, "predicted": <num> }, ...],
          "metrics": { "count": N, "mae": ..., "rmse": ..., "r2": ... }
        }

Args:
  --bundle    Path to the same DuckDB bundle that was used for training.
  --design    Path to the design.json (must include backtest.cutoff).
  --model     Path to the saved model.bin.
  --out       Where to write the backtest result JSON.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any


ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def log(msg: str) -> None:
    print(f"[backtest_cli] {msg}", flush=True)


def _stringify(value: Any) -> str:
    """RelML predict() expects string values."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    return str(value)


def _normalize_field(value: str, field_type: str) -> str:
    """
    Match the train-time convention: date-typed fields get parsed as naive
    local datetimes and converted to unix-seconds. See predict_cli.py for
    the rationale.
    """
    if field_type == "date" and isinstance(value, str) and ISO_DATE_RE.match(value):
        dt = datetime.strptime(value, "%Y-%m-%d")
        return str(int(dt.timestamp()))
    return value


def _to_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        if hasattr(v, "item"):
            v = v.item()
        return float(v)
    except Exception:
        return None


def _safe_corr(actuals: list[float], preds: list[float]) -> float | None:
    n = len(actuals)
    if n == 0:
        return None
    mean_a = sum(actuals) / n
    mean_p = sum(preds) / n
    num = sum((a - mean_a) * (p - mean_p) for a, p in zip(actuals, preds))
    var_a = sum((a - mean_a) ** 2 for a in actuals)
    if var_a == 0:
        return None
    var_p = sum((p - mean_p) ** 2 for p in preds)
    if var_p == 0:
        return None
    return num / math.sqrt(var_a * var_p)


def _r2(actuals: list[float], preds: list[float]) -> float | None:
    n = len(actuals)
    if n == 0:
        return None
    mean_a = sum(actuals) / n
    ss_tot = sum((a - mean_a) ** 2 for a in actuals)
    if ss_tot == 0:
        return None
    ss_res = sum((a - p) ** 2 for a, p in zip(actuals, preds))
    return 1.0 - ss_res / ss_tot


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Backtest a trained RelML model on its held-out window",
    )
    parser.add_argument("--bundle", required=True)
    parser.add_argument("--design", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    design_path = Path(args.design)
    bundle_path = Path(args.bundle)
    model_path = Path(args.model)
    out_path = Path(args.out)

    if not design_path.is_file():
        log(f"ERROR: design file missing: {design_path}")
        return 2
    if not bundle_path.is_file():
        log(f"ERROR: bundle file missing: {bundle_path}")
        return 2
    if not model_path.is_file():
        log(f"ERROR: model file missing: {model_path}")
        return 2

    design = json.loads(design_path.read_text())
    backtest = design.get("backtest") or {}
    cutoff = backtest.get("cutoff")
    time_col = design.get("time_col", "")
    if not cutoff or not time_col:
        log("ERROR: design has no backtest.cutoff or time_col — nothing to backtest")
        return 2

    target_col = design["target_column"]

    try:
        import duckdb  # noqa: F401
        import qlm.qwery.relml as relml
        from qlm.qwery.relml import (
            TaskSpec,
            InferenceField,
            InferenceOutput,
            InferenceSchema,
        )
    except ImportError as e:
        log(f"ERROR: RelML or duckdb not installed: {e}")
        return 3

    inputs_cfg = design["inference_schema"]["inputs"]
    output_cfg = design["inference_schema"]["output"]
    inference_schema = InferenceSchema(
        inputs=[
            InferenceField(
                field=f["field"],
                role=f["role"],
                type=f["type"],
                required=bool(f.get("required", True)),
                references=f.get("references", ""),
                description=f.get("description", ""),
            )
            for f in inputs_cfg
        ],
        output=InferenceOutput(
            type=output_cfg["type"],
            description=output_cfg.get("description", ""),
            num_classes=int(output_cfg.get("num_classes", 0) or 0),
        ),
    )

    # IMPORTANT: load the model with the FULL task_sql (no backtest filter),
    # so the held-out rows are present in the task table and predict() can
    # find them.
    full_task_sql = design["task_sql"]

    task = TaskSpec(
        sql=full_task_sql,
        task_table_name=design["task_table_name"],
        target_column=target_col,
        task_type=design["task_type"],
        label_transform=design["label_transform"],
        split_strategy=design.get("split_strategy", "random"),
        time_col=time_col,
        dataset_schema=design["dataset_schema"],
        inference_schema=inference_schema,
    )

    hp = design["hyperparameters"]

    log(f"connecting to bundle: {bundle_path}")
    conn = duckdb.connect(str(bundle_path))

    log("loading model with full task_sql (held-out rows included)")
    try:
        model = relml.load_model(
            conn=conn,
            task=task,
            path=str(model_path),
            channels=int(hp["channels"]),
            gnn_layers=int(hp["gnn_layers"]),
            hidden=int(hp["hidden"]),
            dropout=float(hp["dropout"]),
            lr=float(hp["lr"]),
            batch_size=int(hp["batch_size"]),
        )
    except Exception as e:
        log(f"ERROR: load_model failed: {e}")
        traceback.print_exc(file=sys.stderr)
        return 1

    # Identify the held-out rows from the task table that RelML built.
    # `task.task_table_name` is created by load_model in the same conn.
    task_table = task.task_table_name

    # Build the SELECT for the held-out rows. We need: time_col, target,
    # plus every entity_key column the inference schema declares. We'll
    # select them by their inference-schema field names since the task
    # table has those exact columns.
    entity_fields = [
        f for f in inputs_cfg if f.get("role") == "entity_key"
    ]
    temporal_fields = [
        f for f in inputs_cfg if f.get("role") == "temporal_key"
    ]

    select_cols: list[str] = [f'"{time_col}"', f'"{target_col}"']
    for ef in entity_fields:
        if ef["field"] not in (time_col, target_col):
            select_cols.append(f'"{ef["field"]}"')

    select_clause = ", ".join(select_cols)
    holdout_query = (
        f'SELECT {select_clause} FROM "{task_table}" '
        f'WHERE "{time_col}" > CAST(\'{cutoff}\' AS TIMESTAMP) '
        f'ORDER BY "{time_col}"'
    )

    log(f"fetching held-out rows: {holdout_query}")
    try:
        held_out_rows = conn.execute(holdout_query).fetchall()
        held_out_cols = [d[0] for d in conn.description]
    except Exception as e:
        log(f"ERROR: failed to fetch held-out rows: {e}")
        return 1

    log(f"backtesting on {len(held_out_rows)} held-out row(s)")

    # Determine field types for normalization (esp. date → unix seconds).
    type_by_field = {f["field"]: f.get("type", "str") for f in inputs_cfg}

    output_rows: list[dict[str, Any]] = []
    actuals: list[float] = []
    preds: list[float] = []
    failures = 0

    for row_tuple in held_out_rows:
        row = dict(zip(held_out_cols, row_tuple))
        actual = _to_float(row.get(target_col))

        # Build the predict() input dict from the routing keys.
        inputs: dict[str, str] = {}
        for ef in entity_fields:
            inputs[ef["field"]] = _normalize_field(
                _stringify(row.get(ef["field"])),
                type_by_field.get(ef["field"], "str"),
            )
        for tf in temporal_fields:
            inputs[tf["field"]] = _normalize_field(
                _stringify(row.get(tf["field"])),
                type_by_field.get(tf["field"], "str"),
            )

        try:
            predicted_raw = model.predict(inputs)
            predicted = _to_float(predicted_raw)
        except Exception as e:
            failures += 1
            if failures <= 5:
                log(f"  predict failed for {inputs}: {e}")
            predicted = None

        # Render the time value as an ISO string for the chart axis.
        time_val = row.get(time_col)
        if isinstance(time_val, datetime):
            time_iso = time_val.isoformat()
        else:
            time_iso = str(time_val) if time_val is not None else ""

        entity_dict: dict[str, str] | None = None
        if entity_fields:
            entity_dict = {
                ef["field"]: _stringify(row.get(ef["field"]))
                for ef in entity_fields
            }

        output_rows.append(
            {
                "time": time_iso,
                "entity": entity_dict,
                "actual": actual,
                "predicted": predicted,
            }
        )

        if actual is not None and predicted is not None:
            actuals.append(actual)
            preds.append(predicted)

    if failures > 0:
        log(f"WARNING: {failures} predict() call(s) failed")

    # Compute metrics on the rows where both actual and predicted are
    # numeric.
    n = len(actuals)
    if n > 0:
        diffs = [a - p for a, p in zip(actuals, preds)]
        mae = sum(abs(d) for d in diffs) / n
        rmse = math.sqrt(sum(d * d for d in diffs) / n)
        r2 = _r2(actuals, preds)
    else:
        mae = None
        rmse = None
        r2 = None

    result = {
        "cutoff": cutoff,
        "rows": output_rows,
        "metrics": {"count": n, "mae": mae, "rmse": rmse, "r2": r2},
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result))
    log(f"wrote backtest result to {out_path}")
    log(
        f"backtest complete: n={n}"
        + (f" mae={mae:.4f}" if mae is not None else "")
        + (f" rmse={rmse:.4f}" if rmse is not None else "")
        + (f" r2={r2:.4f}" if r2 is not None else "")
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        log("cancelled by signal")
        sys.exit(130)
    except Exception as e:  # pragma: no cover
        log(f"ERROR: unhandled exception: {e}")
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
```

**Load-bearing details:**

- **Loads with the FULL `task_sql`, NOT the cutoff-filtered one.** This is the inverse of `train_cli.py`. The held-out rows must be in the materialized task table for `predict()` to find them by `(entity_keys, temporal_keys)` lookup. If you accidentally apply the cutoff filter here, predict will hit `no matching row found` for every held-out row.
- The held-out window is defined as `time_col > cutoff` (strict inequality), matching the **inclusive** cutoff convention used at train time (`time_col <= cutoff`).
- `select_cols` builds its column list from `inference_schema.inputs` field names — those are the *exact* column names that exist in the materialized task table (RelML projects them through). If your task SQL renames columns via `AS`, the inference-schema field names must match the post-AS names.
- `failures <= 5` log cap exists because a misconfigured backtest can fail thousands of times; we only want the first few traces.
- Date inputs are normalized through the same naive-local-time conversion as `predict_cli.py` for the same reason.
- The output JSON is read by `apps/server/src/lib/ml/compute-diagnosis.ts` to fold backtest R² / RMSE / MAE into the structured diagnosis.

### 13.5 Helper scripts (optional)

`convert_data.py` and `load_relbench_ratebeer.py` set up sample Postgres datasets (MovieLens-1M and RelBench rel-ratebeer respectively). Not required by the integration; ship them only if you want one-shot demo-data loading. Both write to a Postgres DSN you control and apply primary + foreign keys at the end so qwery's metadata fetcher picks them up.

### 13.6 Critical small TS helpers — full source

The following three TS files in `apps/server/src/lib/ml/` are short and load-bearing — if you mistype any of them the integration will subtly break. Embedded in full so you can verify line-by-line.

#### `apps/server/src/lib/ml/quote-ident.ts`

```ts
const SAFE_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Quote a table or column identifier for use in a SELECT statement.
 * Supports bare identifiers and schema-qualified names (e.g. `public.users`).
 * Uses double-quote style, which is ANSI-standard and works for Postgres,
 * DuckDB, MySQL (in ANSI mode), ClickHouse, and SQLite.
 */
export function quoteIdent(name: string): string {
  const parts = name.split('.').map((part) => {
    if (SAFE_IDENT.test(part)) return `"${part}"`;
    return `"${part.replace(/"/g, '""')}"`;
  });
  return parts.join('.');
}
```

#### `apps/server/src/lib/ml/normalize-design.ts`

Critical because it is the layer that bridges the agent's schema-prefixed output and DuckDB's flat `main` schema. The empty-string-PK → `null` rewrite is what lets fact tables (`ratings`, `transactions`, etc.) train at all.

```ts
import type { MLTaskDesign } from '@qwery/domain/entities';

export interface NormalizedDesign {
  /** The design rewritten so it resolves against DuckDB's `main` schema. */
  design: MLTaskDesign;
  /**
   * Mapping from the unqualified table name used in the bundle (key) to the
   * fully qualified name as it appears in the source datasource (value).
   * The bundle builder uses this to SELECT from the source and CREATE in main.
   */
  sourceTablesByLocalName: Map<string, string>;
}

function stripQuotes(name: string): string {
  if (name.length >= 2) {
    const first = name[0];
    const last = name[name.length - 1];
    if ((first === '"' && last === '"') || (first === '`' && last === '`')) {
      return name.slice(1, -1);
    }
  }
  return name;
}

function unqualify(qualified: string): string {
  const parts = qualified.split('.').map(stripQuotes);
  return parts[parts.length - 1] ?? qualified;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeDesignForBundle(
  design: MLTaskDesign,
): NormalizedDesign {
  const sourceTablesByLocalName = new Map<string, string>();

  const qualifiedNames = new Set<string>();
  for (const [tableName, table] of Object.entries(design.dataset_schema)) {
    qualifiedNames.add(tableName);
    for (const fk of table.fks ?? []) {
      if (fk.references) qualifiedNames.add(fk.references);
    }
  }

  const newDatasetSchema: MLTaskDesign['dataset_schema'] = {};
  for (const [tableName, table] of Object.entries(design.dataset_schema)) {
    const local = unqualify(tableName);
    if (local !== tableName) {
      sourceTablesByLocalName.set(local, tableName);
    } else {
      sourceTablesByLocalName.set(local, local);
    }
    newDatasetSchema[local] = {
      pk: table.pk,
      fks: (table.fks ?? []).map((fk) => ({
        column: fk.column,
        references: unqualify(fk.references),
      })),
    };
  }

  // Longest-first ordering of local names avoids prefix collisions
  // (e.g. `dim_date_lookup` vs `dim_date`).
  const localTableNames = [
    ...new Set(
      [...qualifiedNames, ...Object.keys(design.dataset_schema)].map(unqualify),
    ),
  ].sort((a, b) => b.length - a.length);

  let newSql = design.task_sql;
  for (const local of localTableNames) {
    const pattern = new RegExp(
      `(?<![A-Za-z0-9_."\`])(?:[A-Za-z_][A-Za-z0-9_]*\\.){1,2}${escapeRegex(local)}(?![A-Za-z0-9_])`,
      'g',
    );
    newSql = newSql.replace(pattern, local);
  }

  // RelML wraps task_sql as `CREATE OR REPLACE TABLE "x" AS (<sql>)`, so a
  // trailing semicolon inside the parens becomes a parser error.
  newSql = newSql.replace(/[;\s]+$/, '');

  return {
    design: {
      ...design,
      task_sql: newSql,
      dataset_schema: newDatasetSchema,
    },
    sourceTablesByLocalName,
  };
}

/**
 * Serialize a design to JSON for the Python CLI. The TypeScript type for
 * `dataset_schema[t].pk` is `string` (we keep it strict in-memory), but
 * RelML's C++ binding tests `is_none()` on `pkey_col` rather than
 * empty-string equality — so we must emit `null` rather than `""` for
 * fact / interaction tables that have no surrogate primary key.
 *
 * Always use this instead of `JSON.stringify(design)` when handing off to Python.
 */
export function serializeDesignForPython(
  design: MLTaskDesign | (MLTaskDesign & { backtest?: unknown }),
): string {
  const datasetSchemaForPython: Record<
    string,
    { pk: string | null; fks: { column: string; references: string }[] }
  > = {};
  for (const [name, table] of Object.entries(design.dataset_schema)) {
    datasetSchemaForPython[name] = {
      pk: table.pk === '' ? null : table.pk,
      fks: table.fks ?? [],
    };
  }
  const forPython = { ...design, dataset_schema: datasetSchemaForPython };
  return JSON.stringify(forPython, null, 2);
}
```

#### `apps/server/src/lib/ml/predict.ts`

```ts
import { join } from 'node:path';

import type { MLTrainingJob } from '@qwery/domain/entities';
import { getLogger } from '@qwery/shared/logger';

const PYTHON_BIN = process.env.QWERY_PYTHON_BIN ?? 'python3';

function resolvePredictCliPath(): string {
  const explicit = process.env.QWERY_ML_PREDICT_CLI_PATH;
  if (explicit) return explicit;
  return join(process.cwd(), '..', '..', 'python', 'predict_cli.py');
}

export interface PredictResult {
  ok: boolean;
  value?: number;
  error?: string;
}

export interface PredictArgs {
  job: MLTrainingJob;
  bundlePath: string;
  designPath: string;
  modelPath: string;
  inputs: Record<string, unknown>;
}

/**
 * Validates inputs against the job's inference schema and spawns the Python
 * predictor CLI. Cold-start cost is paid on every call (model + graph are
 * rebuilt); acceptable for small schemas, replace with a warm worker when
 * we start caring about p95 latency.
 */
export async function runPrediction(args: PredictArgs): Promise<PredictResult> {
  const logger = await getLogger();
  const schema = args.job.design.inference_schema;

  const missing: string[] = [];
  for (const field of schema.inputs) {
    if (!field.required) continue;
    const raw = args.inputs[field.field];
    if (raw === undefined || raw === null || raw === '') {
      missing.push(field.field);
    }
  }
  if (missing.length > 0) {
    return { ok: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  const allowedFields = new Set(schema.inputs.map((f) => f.field));
  const unknown = Object.keys(args.inputs).filter((k) => !allowedFields.has(k));
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `Unknown fields not declared in inference schema: ${unknown.join(', ')}`,
    };
  }

  const cliPath = resolvePredictCliPath();
  const spawnArgs = [
    cliPath,
    '--bundle', args.bundlePath,
    '--design', args.designPath,
    '--model',  args.modelPath,
    '--input',  JSON.stringify(args.inputs),
  ];

  logger.debug({ jobId: args.job.id, cli: cliPath }, '[predict] spawning predict CLI');

  const proc = Bun.spawn([PYTHON_BIN, ...spawnArgs], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  });

  const [stdoutText, stderrText, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    logger.warn(
      { jobId: args.job.id, exitCode, stdout: stdoutText.slice(-2000), stderr: stderrText.slice(-2000) },
      '[predict] predictor CLI exited non-zero',
    );
  }

  // The CLI prints a single JSON line on stdout even on failure.
  const lines = stdoutText.trim().split('\n').filter((l) => l.length > 0);
  const lastLine = lines[lines.length - 1];
  if (!lastLine) {
    return {
      ok: false,
      error: stderrText.trim() || `Predictor returned no output (exit ${exitCode})`,
    };
  }

  try {
    const parsed = JSON.parse(lastLine) as PredictResult;
    return parsed;
  } catch {
    return {
      ok: false,
      error: `Predictor returned malformed output: ${lastLine.slice(0, 200)}`,
    };
  }
}
```

For the **larger** TS files (`bundle-builder.ts`, `job-manager.ts`, `validate-design.ts`, `validate-task-design.ts`, `parse-metrics.ts`, `compute-diagnosis.ts`, the Hono router, and every web component), copy them verbatim from `apps/server/src/lib/ml/`, `apps/server/src/routes/ml-tasks.ts`, and `apps/web/app/routes/datasource/_components/model-builder/` in this repo. The behaviour described in §10 and §15 is the contract; the source files are authoritative.

---

## 14. Step 10 — Install RelML in the Python environment

The CLIs assume `qlm.qwery.relml` is importable from `python3`. Build and install it once:

```bash
# pick the venv qwery will spawn from
source /path/to/your/venv/bin/activate

# clone RelML next to qwery-core
git clone <relml-repo> /path/to/RelML
cd /path/to/RelML

# build the C++ core
cmake -B build -DPython_EXECUTABLE=$(which python3)
cmake --build build -j

# verify the .so dropped into the source tree with the right Python tag
ls python/qlm/qwery/relml/_relml_core*

# editable install
pip install -e ./python

# runtime deps
pip install duckdb numpy scikit-learn pandas

# smoke test
python3 -c "from qlm.qwery.relml import TaskSpec, InferenceSchema; print('ok')"
```

(All of the above is the abridged form of `relml.md` §2 — refer to that file for prerequisites, OpenMP install on macOS, troubleshooting build issues, and Python version pinning.)

---

## 15. Step 11 — Add the Web Model Builder route

Create `apps/web/app/routes/datasource/model-builder.tsx` and the supporting components under `apps/web/app/routes/datasource/_components/model-builder/`. The route is a 4-step wizard:

| Step | File | What it does |
|------|------|--------------|
| **Describe** | `step-describe.tsx` | Textarea + schema-grounded suggestions (`/suggest`) + clarify panel (`/design/clarify`). |
| **Design** | `step-design.tsx` | Renders the design returned by the agent. Lets the user edit the inference schema, hyperparameters, and backtest holdout. |
| **Train** | `step-train.tsx` + `training-panel.tsx` + `metrics-charts.tsx` | Live SSE log; per-epoch metrics charts; cancel button; on-completion → diagnosis card + improve button. |
| **Use** | `step-use.tsx` + `inference-panel.tsx` + `backtest-panel.tsx` | Form auto-generated from `inference_schema.inputs`. Calls `/predict`. Backtest panel shows held-out predictions vs. actuals. |

Add the repository client and the helper service:

- `apps/web/lib/repositories/ml-tasks-client.ts` — typed wrappers for every endpoint (`suggestMLTasksRequest`, `clarifyMLTaskRequest`, `designMLTaskRequest`, `startTrainingRequest`, `improveMLTaskRequest`, `recoverMLTaskRequest`, `cancelTrainingRequest`, `getTrainingJobRequest`, `listTrainingJobsByDatasource`, `getBacktestResult`, `predictRequest`, `subscribeToTrainingLogs`).
- `apps/web/lib/services/run-datasource-query.ts` — runs an arbitrary SQL string against the user's source datasource (powers the preview grid). Browser-runtime drivers stay in the browser; node-runtime drivers go through the existing `driverCommand` proxy.

The repository client uses the existing `apiPost`, `apiGet`, `ApiError`, `apiRequestOptions` from `apps/web/lib/repositories/api-client` — no changes to that file are needed.

`subscribeToTrainingLogs(jobId, { onLog, onStatus, onError })` opens a native `EventSource` against `/api/ml-tasks/train/:jobId/stream` with `withCredentials: true` and self-closes on a terminal status.

---

## 16. Step 12 — Wire route, navigation, paths, i18n

Apply the four small modifications enumerated in §3 (routes.ts, paths.config.ts, datasource.navigation.config.tsx, common.json). After these edits the Model Builder appears as a "Brain" icon item in the datasource sidebar.

If you already have additional locales, replicate the new `routes.datasourceModelBuilder` key in each.

---

## 17. Step 13 — Configure environment variables

The server reads four optional env vars. Defaults are listed below.

| Var | Default | Meaning |
|-----|---------|---------|
| `QWERY_PYTHON_BIN` | `python3` | Python interpreter `Bun.spawn` invokes for every CLI. |
| `QWERY_STORAGE_DIR` | `qwery.db` | Root storage directory. ML jobs land under `${this}/ml/<jobId>/`. |
| `QWERY_ML_CLI_PATH` | `<cwd>/../../python/train_cli.py` | Override the path to the training CLI. |
| `QWERY_ML_BACKTEST_CLI_PATH` | `<cwd>/../../python/backtest_cli.py` | Override the path to the backtest CLI. |
| `QWERY_ML_PREDICT_CLI_PATH` | `<cwd>/../../python/predict_cli.py` | Override the path to the predict CLI. |

The defaults assume the server runs from `apps/server/` (Bun's default `cwd` when launched via `pnpm --filter @qwery/server dev`). If your monorepo layout differs, set the three `*_CLI_PATH` vars explicitly.

Example `.env` for a venv-installed RelML:

```bash
QWERY_PYTHON_BIN=/Users/me/.virtualenvs/qwery/bin/python
QWERY_STORAGE_DIR=/var/lib/qwery
QWERY_ML_CLI_PATH=/var/lib/qwery/python/train_cli.py
QWERY_ML_BACKTEST_CLI_PATH=/var/lib/qwery/python/backtest_cli.py
QWERY_ML_PREDICT_CLI_PATH=/var/lib/qwery/python/predict_cli.py
```

---

## 18. Step 14 — Smoke test the full pipeline

After everything is wired, validate end-to-end:

```bash
# 1. Build everything
pnpm install
pnpm typecheck

# 2. Start the server
pnpm --filter @qwery/server dev
# → expect: "Discovered N datasource extensions"
# → expect: "[job-manager] restored 0 training job(s) from disk" (or no message if none)

# 3. Start the web app
pnpm --filter @qwery/web dev

# 4. In the browser:
#    - register a Postgres datasource
#    - navigate to /ds/<slug>/model-builder
#    - type "predict whether a user rates a movie 4+ stars"
#    - the agent should either return MCQs or jump straight to a design
#    - click Train; the live log should show:
#         [job] starting
#         [job] building DuckDB training bundle
#         [bundle] Fetching source table public.users…
#         [bundle]   users: 6,040 rows
#         [job] spawning: python3 /repo/python/train_cli.py --bundle … --design …
#         [train_cli] starting training: …
#         Epoch | Train Loss | Val Loss | …
#         1 | 0.42 | 0.51 | …
#         …
#    - on completion you should see "succeeded" + a diagnosis card
#    - click Use, fill in userId + movieId, hit Predict — single number returned
```

Server logs you should see at each phase:

| Phase | Log line |
|-------|----------|
| Design | `[design] task_sql validated against phantom schema` |
| Bundle | `[bundle] Fetching source table …` |
| Spawn  | `[job] spawning: python3 …/train_cli.py --bundle …` |
| Backtest (if configured) | `[backtest] cutoff=YYYY-MM-DDT…` |
| Diagnosis | `[job] computing diagnosis…` |
| Done   | `[job] training completed successfully` |

If any of these are missing, jump to §21.

---

## 19. Contracts reference

### 19.1 design.json on disk (what the Python CLIs read)

```jsonc
{
  "task_sql": "SELECT … FROM ratings r JOIN users u ON u.userId = r.userId …",
  "task_table_name": "ratings_task",
  "target_column": "label",
  "task_type": "binary_classification",
  "label_transform": { "kind": "threshold", "threshold": 0.5 },
  "split_strategy": "temporal",
  "time_col": "timestamp",
  "dataset_schema": {
    "users":   { "pk": "userId",   "fks": [] },
    "movies":  { "pk": "movieId",  "fks": [] },
    "ratings": {
      "pk":  null,           // rewritten from "" by serializeDesignForPython
      "fks": [
        { "column": "userId",  "references": "users" },
        { "column": "movieId", "references": "movies" }
      ]
    }
  },
  "inference_schema": {
    "inputs": [
      { "field": "userId",  "role": "entity_key", "type": "int", "required": true,
        "references": "users",  "description": "MovieLens user id" },
      { "field": "movieId", "role": "entity_key", "type": "int", "required": true,
        "references": "movies", "description": "MovieLens movie id" }
    ],
    "output": { "type": "probability", "description": "P(rating>=4)", "num_classes": 0 }
  },
  "hyperparameters": {
    "channels": 32, "gnn_layers": 2, "hidden": 64,
    "dropout": 0.2, "lr": 0.0003, "epochs": 50, "batch_size": 0
  },
  "backtest": {                  // optional
    "holdout_rows": 30,
    "cutoff": "2026-04-30T00:00:00.000Z"
  }
}
```

### 19.2 SSE stream events (`/train/:jobId/stream`)

```text
event: log
data: <one log line, no envelope>

event: status
data: {"status":"running"|"succeeded"|"failed"|"cancelled","error":"…"}
```

The server closes the stream after the first terminal status.

### 19.3 Predict request / response

```http
POST /api/ml-tasks/train/:jobId/predict
Content-Type: application/json

{ "inputs": { "userId": "42", "movieId": "1193" } }
```

```json
{ "success": true, "data": { "ok": true, "value": 0.7821 } }
```

`predict_cli.py` always prints exactly one JSON object as its last stdout line, even on failure. The server forwards that object verbatim.

### 19.4 Improvement / recovery proposal

```http
POST /api/ml-tasks/train/:jobId/improve
{ "metadata": <DatasourceMetadata>, "model": "<optional>" }
```

```jsonc
{
  "success": true,
  "data": {
    "design": <MLTaskDesign with contract fields pinned to the parent>,
    "changes": [
      { "area": "task_sql", "summary": "Add 7-day MA of orders",
        "evidence_cited": ["underfitting", "val_over_train=1.05"],
        "principle": "encoder skips the target column",
        "expected_effect": "val RMSE should drop 10-20%, R² > 0.4 on backtest",
        "rationale": "Train loss barely moved; the model lacks lag signal." }
    ],
    "rationale": "Underfitting + weak backtest. Adding a 7-day MA…",
    "confidence": "medium"
  }
}
```

`/recover` has the same shape — internally it calls the same agent with `runtimeError` set to the captured stderr tail.

---

## 20. Filesystem layout of a training job

```
${QWERY_STORAGE_DIR}/
└── ml/
    └── <jobId>/                 # randomUUID()
        ├── job.json             # MLTrainingJob — written on every status change
        ├── design.json          # serializeDesignForPython output
        ├── bundle.duckdb        # built by bundle-builder
        ├── train.log            # all stdout/stderr from train_cli (no [stderr] prefix)
        ├── model.bin            # written by relml.save_model
        ├── model.schema.json    # written by relml.save_schema (sidecar; NOT what we re-attach)
        └── backtest.json        # written by backtest_cli (optional)
```

`subscribeToJob` replays the in-memory `logBuffer` to late subscribers, so a client that connects mid-run still sees everything from `[job] starting` onward.

---

## 21. Troubleshooting

### `ImportError: No module named qlm.qwery.relml`

Python can't find RelML in the env that `Bun.spawn` is launching. Either `pip install -e <relml>/python` in that env, or set `QWERY_PYTHON_BIN` to the venv's interpreter explicitly.

### `[job] spawning: python3 ../../python/train_cli.py …` but `ENOENT`

The default `QWERY_ML_CLI_PATH` resolves relative to `process.cwd()`. If you run the server with a different CWD, set the absolute path:

```bash
QWERY_ML_CLI_PATH=$PWD/python/train_cli.py
```

### Training silently makes useless predictions, target leakage suspected

This is a SQL-level issue (window frame ending at `CURRENT ROW`, target derived twice, future joined). Run `/improve` against the failed job — the agent will read the diagnosis flag `leakage_suspected` and propose a SQL rewrite. Hyperparameter tuning will not fix it.

### `RuntimeError: pkey_col is required for table X` from RelML

The C++ binding tested `is_none()` on the PK, but JavaScript serialised an empty string. Verify the design hit `serializeDesignForPython` (not `JSON.stringify(design)`) before being written to disk.

### Server restart left jobs in a `running` state

`restoreJobsFromDisk()` reconciles them to `failed` with a clear reason. If you don't see this, you forgot to add `await restoreJobsFromDisk()` in `apps/server/src/index.ts` (Step 8).

### SSE stream closes immediately

The server closes the stream when the job is already terminal. Check the job status first:

```bash
curl /api/ml-tasks/train/<jobId>
```

If `status === "succeeded"` or `"failed"`, just fetch the final state and skip the stream.

### Postgres metadata refresh is slow

The new `pg_class.reltuples` query is O(tables-in-cluster). On a Postgres with thousands of unrelated tables, narrow the `WHERE n.nspname NOT IN (…)` exclusion list to the schemas the user actually exposes.

### The agent's design references a schema-qualified table that DuckDB rejects

`normalizeDesignForBundle` strips schema prefixes; if it didn't catch one, your `dataset_schema` entry was missing. Always declare every table the SQL touches in `dataset_schema` — the normaliser uses that set as the matching alphabet.

### Predict returns `Trainer::predict_row: no matching row found`

For temporal tasks, `predict()` looks up the row by `(entity_keys, temporal_keys)`. The values must exist in the materialized task table. If the user wants to predict for a hypothetical future date, drop the `temporal_key` field from the inference schema so the routing falls back to entity synthesis.

### Date inputs return `predict()` row mismatch even when the date exists

This is the local-time-vs-UTC edge case `predict_cli.py` already handles by converting `YYYY-MM-DD` → `int(datetime.strptime(...).timestamp())`. If your CLI is older or you replaced it, restore that conversion — RelML's internal table loader applies `datetime.timestamp()` to naive datetimes returned by DuckDB and interprets them as **local** time.

---

## Appendix A — One-page checklist for a fresh integration

1. [ ] `pnpm add @duckdb/node-api@1.4.2-r.1` in `apps/server`
2. [ ] `pnpm add motion@^12.23.24` in `apps/web`
3. [ ] Copy `packages/domain/src/entities/ml-task.type.ts`; export from `index.ts`
4. [ ] Patch `packages/extensions-sdk/src/metadata-builder.ts` (`rowCounts` field + `live_rows_estimate` plumbing)
5. [ ] Patch `packages/extensions/postgresql/src/driver.ts` (`PG_TYPE_BY_OID`, row-count query, pass `rowCounts`)
6. [ ] Copy seven services into `packages/agent-factory-sdk/src/services/`; re-export
7. [ ] Copy nine files into `apps/server/src/lib/ml/`
8. [ ] Copy `apps/server/src/routes/ml-tasks.ts`
9. [ ] Edit `apps/server/src/server.ts` to mount the router
10. [ ] Edit `apps/server/src/index.ts` to call `restoreJobsFromDisk()`
11. [ ] Edit `apps/server/tsconfig.json` to enable decorator metadata
12. [ ] Copy `python/{train,predict,backtest}_cli.py`
13. [ ] Build + install `qlm.qwery.relml` into the venv qwery will spawn
14. [ ] Copy `apps/web/lib/repositories/ml-tasks-client.ts`
15. [ ] Copy `apps/web/lib/services/run-datasource-query.ts`
16. [ ] Copy `apps/web/app/routes/datasource/model-builder.tsx` + 22 components under `_components/model-builder/`
17. [ ] Edit `apps/web/app/routes.ts`, `apps/web/config/paths.config.ts`, `apps/web/config/datasource.navigation.config.tsx`, `apps/web/lib/i18n/locales/en/common.json`
18. [ ] Set `QWERY_PYTHON_BIN`, `QWERY_STORAGE_DIR`, and the three `*_CLI_PATH` vars (or accept the defaults)
19. [ ] `pnpm typecheck` clean
20. [ ] Smoke-test against a Postgres datasource

---

## Appendix B — Internal call graph

```
POST /api/ml-tasks/design/clarify
  → clarifyMLTask()                         packages/agent-factory-sdk/services
    → buildSchemaDigest(metadata)
    → generateObject(model, prompt)
  if not ready: return MCQs
  else:
    → mergeAnswersIntoDescription
    → designMLTask({ description, metadata })
      → buildSchemaDigest
      → generateObject
    → normalizeDesignForBundle               apps/server/src/lib/ml/normalize-design
    → validateWithAutoFix
      → validateTaskSql(sql, metadata)       …/validate-design
      → autoFixCandidates(sql, error)        …/validate-design
    → validateTaskDesign(design, metadata)   …/validate-task-design
  → return { ready: true, design }

POST /api/ml-tasks/train
  → startTrainingJob({ datasource, design, … })   …/job-manager
    → buildTrainingBundle
      → driverInstance.query("SELECT * FROM …")  via @qwery/extensions-loader
      → DuckDBInstance.create(bundlePath)
      → computeBacktestCutoff (if temporal+backtest)
    → serializeDesignForPython → write design.json
    → Bun.spawn(python3 train_cli.py …)
       train_cli.py:
         → relml.train(conn, task, **hp)
         → relml.save_model / save_schema
    on success:
      → Bun.spawn(python3 backtest_cli.py …)   (when backtest configured)
      → computeDiagnosis(train.log, backtest.json)
      → status='succeeded'

POST /api/ml-tasks/train/:id/predict
  → runPrediction({ job, … })                …/predict.ts
    → validate inputs against job.design.inference_schema
    → Bun.spawn(python3 predict_cli.py --input '{…}')
       → relml.load_model(conn, task, model.bin, **hp)
       → model.predict(inputs)
       → print({"ok": true, "value": …})
```
