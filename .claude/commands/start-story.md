---
description: Move a pending story to wip inside its own git worktree, auto-generate its task files, and load it as the active focus.
argument-hint: <story-folder>
---

You are starting work on a story. The user ran `/start-story $ARGUMENTS`.

This single command does task generation + status transition + worktree creation. There is no separate `/story-to-tasks` by design (see `.claude/rules/spec-driven-dev.md`).

## Inputs

- Story folder: `$1` (path under `docs/stories/<rfc-id>-<rfc-slug>/phase<N>/`, resolved relative to the main repo root).
- Template: `.claude/templates/task.md`.
- Rules: `.claude/rules/spec-driven-dev.md`, `.claude/rules/validation.md`, `.claude/rules/model-routing.md`.

## Preconditions

- Invoked from the **main repo root**, not from inside an existing worktree. If `git rev-parse --git-common-dir` != `.git`, refuse and say: *"/start-story must be run from the main repo, not from a worktree."*
- The story folder exists and its name ends in `-[pending]`. Any other suffix → refuse.
- No other story in the same phase is currently `-[wip]` for this user. Enforce via `find docs/stories -maxdepth 5 -type d -name "*-[wip]"`. If hit, refuse.
- The main repo's current branch is `main` and `git status --porcelain` is empty. If not, refuse and tell the user to commit or stash first — worktree creation forks from `HEAD`.

## Steps

1. **Enter plan mode.** Do nothing destructive until approval.
2. **Read `story.md`** and the **spec sections it references by anchor**. Read both fully.
3. **Draft the task list.** Derive atomic tasks from the spec's §7 file-by-file work items, filtered to what this story's scope actually touches. Rules:
   - Verb-first slugs: `001-add-domain-entity`.
   - 1 to 8 tasks (`kind: bugfix` tasks spawned later are carve-outs and don't count).
   - One task per hexagonal layer it touches, plus one per test suite.
   - Ordered top-down: domain → adapter → shell → server → features → plugin → i18n → tests.
   - Each task references the story via `story: ./story.md` in frontmatter.
4. **Assign `model:`** from `.claude/rules/model-routing.md`:
   - `layer: docs | i18n` → `haiku`
   - `layer: domain | adapter | server | shell | plugin | features | tests | db | bugfix` → `sonnet`
   - Never assign `opus` here.
5. **Seed `validation:`** from `layer:`:
   - `layer: domain` → `domain-test` (point to the test file the task will add)
   - `layer: server` → `route-test`
   - `layer: features | plugin | shell` (or anything touching a visible route) → `ui-smoke` with a plausible `route:`. For the task that adds the e2e spec, use `e2e`.
   - `layer: adapter | tests | db | i18n | docs` → `typecheck-only` unless a test suite is added.
   - Never leave `validation:` blank.
6. **Plan the mutations** and present via ExitPlanMode:
   1. Compute the worktree path: `.worktrees/<NNN>-<slug>` (where `<NNN>-<slug>` is the story folder's stem, minus `-[pending]`).
   2. Compute the branch name: `story/<rfc-id>-<rfc-slug>/phase<N>/<NNN>-<slug>`. Derive `<rfc-id>-<rfc-slug>` from the parent-of-`phaseN` segment of the story path — that folder is already named canonically by `/spec-to-stories`.
   3. `git worktree add -b <branch> .worktrees/<NNN>-<slug> main` — creates the branch from `main` and checks it out in the worktree.
   4. **Provision the preview environment**: `bash scripts/sdd/setup-preview.sh <NNN> .worktrees/<NNN>-<slug>`. Generates `.preview.env`, copies `apps/web/.env.local` + `apps/server/.env` from the main repo, rewrites port-bound keys, and patches the worktree's `apps/web/supabase/config.toml` (project_id + ports). `.preview.env` is gitignored by pattern; the patched `config.toml` stays worktree-local because the worktree has its own copy.
   5. **Inside the worktree**: rename `docs/stories/<rfc-id>-<rfc-slug>/phase<N>/<NNN>-<slug>-[pending]/` → `-[wip]/`. Update `status: wip` and `started: <YYYY-MM-DD>` in the story frontmatter.
   6. **Inside the worktree**: create each task file inside the renamed folder from `.claude/templates/task.md`, status `[pending]`, with `model:` + `validation:` filled in.
   7. **Inside the worktree**: update the Tasks section of `story.md` with links to each task file.
   8. **Inside the worktree**: `git add` the renamed folder and commit: `feat(sdd): start story <NNN>-<slug>`. The commit must not include `.preview.env` or the patched `apps/web/.env.local` / `apps/server/.env` / `apps/web/supabase/config.toml` — those are worktree-local runtime artifacts.
7. **After approval**, execute the mutations in order. Stop on any failure and report which step failed. On a partial failure, print the manual recovery steps (e.g. `git worktree remove --force .worktrees/<NNN>-<slug>`).
8. **Print the focus summary** to the user:

```
Story wip: <NNN>-<slug>
Worktree: .worktrees/<NNN>-<slug>
Branch:   story/<rfc-id>-<rfc-slug>/phase<N>/<NNN>-<slug>
Tasks:    N queued
Preview:  web=<WEB_PORT> server=<SERVER_PORT> supabase=<SB_API>

Next step:
  cd .worktrees/<NNN>-<slug>
  pnpm preview    # sources .preview.env, starts supabase + web + server on worktree ports
  # work on 001-<slug>, then run `/finish 001-<slug>-[pending].md` from inside the worktree
```

## Invariants

- **Status transition is a rename** tracked by git.
- **One `[wip]` per phase per person.**
- **Tasks live flat inside the story folder.** No subfolders.
- **ExitPlanMode is mandatory** before any filesystem change.
- **Every task has `model:` and `validation:`.**
- **The story always starts in a clean worktree forked from `main`.** Never carry forward uncommitted changes from the main repo.
- **The initial "start story" commit is the worktree's first commit.** Task-level commits land on top of it.
- **`.preview.env` and any port-rewritten `.env.local` / `supabase/config.toml` are worktree-local runtime artifacts.** Never commit them — the setup script regenerates them on demand. Verify `git status` is clean of these before the start-story commit.
