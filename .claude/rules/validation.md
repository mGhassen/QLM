# Validation

Every task's `validation:` frontmatter block is **executable**. `/finish` reads `kind` and dispatches to the matching runner. No `kind` → refuse the task.

## Kinds

### `typecheck-only`

No extra fields. Runner: `pnpm typecheck`. For pure renames, frontmatter bumps, barrel-export shuffles.

### `domain-test`

```yaml
validation:
  kind: domain-test
  specs:
    - packages/domain/__tests__/services/user-token/create.test.ts
```

Runner: `pnpm --filter @qlm/domain test -- <specs>`. Use for domain services, entities, exceptions.

### `route-test`

```yaml
validation:
  kind: route-test
  specs:
    - apps/server/__tests__/user-tokens.test.ts
```

Runner: `pnpm --filter server test -- <specs>`. Hono route handlers, middleware, http utilities.

### `ui-smoke`

```yaml
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/dashboard
  expect_console: empty            # no exceptions, no new warnings
  expect_network_2xx:              # optional allowlist — these must return 2xx
    - /api/billing/status
```

Runner: delegate to the `ui-validator` agent. Agent navigates via Chrome MCP, reads console + network, returns `PASS | FAIL | BUG_COMPLEX`. `/finish` blocks `[done]` on `FAIL`; spawns a bugfix task on `BUG_COMPLEX` (see below).

Use for: any UI task in `packages/ui/**`, `packages/features/**`, `packages/apps/**`, or `apps/web/src/**` that renders something.

### `e2e`

```yaml
validation:
  kind: e2e
  specs:
    - apps/web/e2e/dashboard.spec.ts
```

Runner: delegate to the `ui-validator` agent with `kind: e2e`. Agent runs `pnpm --filter web e2e -- <specs>`, parses Playwright output, watches console during the run. Same three outcomes as `ui-smoke`.

## Failure handling — inline fix vs bugfix task

When a validator returns `FAIL`, the agent diagnoses before reporting back:

1. **Test itself is wrong** (selector broken, flake, missing fixture) → fix the test, re-run once, report.
2. **App is wrong** — the agent proposes a fix. Two gates apply:
   - **Files gate**: every file the fix needs to touch is in the task's `files:` allowlist.
   - **Blast-radius gate**: single package, ≤2 files, no port/schema/RLS/auth changes.
   - **Both pass** → fix inline, re-run, report `PASS (fixed N app issues inline)`.
   - **Either fails** → return `BUG_COMPLEX` with a triage note. `/finish` then:
     - Creates a new task file in the same story folder from `.claude/templates/bugfix-task.md`, named `NNN-fix-<slug>-[pending].md` with `layer: bugfix`.
     - Marks the current task `[blocked]` with a pointer to the new bugfix task.
     - Returns control to the user with: *"Bugfix task created at `<path>`. Run `/start-story` to continue, or fix manually."*

## Caps and counting

- `kind: bugfix` tasks are **carve-outs**: excluded from the 1–8 tasks-per-story cap. A flaky test must never force a story split.
- `/finish` story branch reports `bugfix-task count` in the spec-accuracy checkpoint. More than 2 spawned in one story → the spec was too optimistic; log a Deviation.

## Hard invariants

- **No `[done]` without a green runner.** This is the whole point.
- **The inline-fix path cannot touch files outside `files:`.** Any such fix is automatically `BUG_COMPLEX`.
- **The `ui-validator` agent must be called for `ui-smoke` and `e2e` kinds.** `/finish` does not shell out to browsers itself.
- **Zero-tolerance on console exceptions by default.** To allow a known warning, list its exact substring under `expect_console.allow` (discouraged — prefer fixing).
