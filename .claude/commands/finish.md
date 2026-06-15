---
description: Close a wip task or a wip story inside its worktree. Runs validators, commits on pass, and locally merges the story branch into main on story close. Never pushes, never opens PRs.
argument-hint: <task-file | story-folder>
---

You are finishing a unit of work. The user ran `/finish $ARGUMENTS`.

This command dispatches on the path suffix:

- **Task file** (`NNN-*-[wip].md` or `NNN-*-[pending].md` inside a `*-[wip]/` parent folder) → **Task branch** below.
- **Story folder** (`*-[wip]/` or `*-[wip]`) → **Story branch** below.
- Anything else → refuse with: *"/finish expects either a task file inside a [wip] story folder, or a [wip] story folder. Got: `$1`"*.

## Inputs (both branches)

- `$1` — the path.
- Rules: `.claude/rules/spec-driven-dev.md`, `.claude/rules/validation.md` — read before anything else.

## Worktree precondition (both branches)

- Run `git rev-parse --git-common-dir`. If it returns `.git` (i.e. you're in the main repo, not a worktree), refuse: *"/finish must be run from inside the story's worktree at `.worktrees/<NNN>-<slug>/`. `cd` into it and rerun."*
- The worktree's branch must match `story/<rfc-id>-<rfc-slug>/phase<N>/<NNN>-<slug>` for the story this task belongs to. If not, refuse. (Stories created before the slug-in-path rule landed may have a bare-id branch like `story/<rfc-id>/phase<N>/...`; accept that shape for backwards compatibility but don't emit it for new work.)

---

## Task branch

### Preconditions

- `$1` is a task file inside a story folder whose name ends in `-[wip]`. Any other parent suffix → refuse.
- Current status suffix is `[wip]` or `[pending]`. `[done]` → refuse. `[blocked]` → refuse with: *"Task is blocked by `<bugfix task path>`. Finish that first."*
- `git status --porcelain` — all changes are inside the task's `files:` allowlist. Any tracked file outside the allowlist → refuse: *"Uncommitted changes outside the task's `files:` allowlist: `<paths>`. Either add them to `files:`, discard, or move them to a new task."*

### Steps

1. **Read the task file** — `layer:`, `files:`, `validation:`, and `done-when` checkboxes. Reject if `validation:` is missing.
2. **Run the validator** by dispatching on `validation.kind`:
   - `typecheck-only` → `pnpm typecheck`.
   - `domain-test` → `pnpm --filter @guepard/domain test -- <specs>`.
   - `route-test` → `pnpm --filter server test -- <specs>`.
   - `ui-smoke` / `e2e` → invoke the `ui-validator` subagent via the Agent tool (`subagent_type: ui-validator`), passing the task's path, the `files:` allowlist, the `validation:` block, and any substituted params.
   - Any other kind → refuse.
3. **Interpret the result**:
   - **Green typecheck/test** → proceed to step 4.
   - **Red** → stop. Task stays `[wip]` (rename from `[pending]` to `[wip]` if needed). Print failure output. No rename to `[done]`, no commit.
   - **Subagent `PASS` or `PASS (fixed ...)`** → if inline edits were made, run `pnpm typecheck` as a safety net. Red typecheck cancels. Otherwise proceed to step 4.
   - **Subagent `FAIL`** → task stays `[wip]`. Report reason. No rename, no commit.
   - **Subagent `BUG_COMPLEX`** → spawn a bugfix task:
     a. Pick the next free `NNN-` in the story folder.
     b. Copy `.claude/templates/bugfix-task.md` to `<story-folder>/NNN-fix-<slug>-[pending].md`.
     c. Fill in `parent_task`, `files:`, `validation:` (inherit parent's kind), Reproduction + Likely cause from the subagent's triage note.
     d. Rename the current task `[wip]` → `[blocked]`, set `status: blocked`, append a Notes bullet: *"Blocked by `<bugfix file>` — <reason>."*
     e. Link the bugfix task from the story's Tasks section.
     f. `git add <blocked task file> <bugfix task file> <story.md>` and commit: `chore(sdd): block <task-slug> pending <bugfix-slug>`.
     g. Print the bugfix-task path and stop.
4. **Human-approval gate** (validator-independent):
   - Print: *"`<runner>` passed. Please run the same flow yourself and confirm."*
   - Show the `route:` (for `ui-smoke`/`e2e`) or the test commands (for domain/route/typecheck) so the user can reproduce.
   - Prompt: *"Respond `approved` or `rejected + one-line reason`."*
   - `rejected` → append the reason to the task's Notes (cap 3), leave at `[wip]`, no rename, no commit.
   - `approved` → proceed.
5. **Rename + commit**:
   - Rename `NNN-<slug>-[wip].md` (or `[pending]`) → `NNN-<slug>-[done].md`. Set `status: done` in frontmatter.
   - Append a one-line entry to the parent story's `## Notes`. Cap 3 bullets; drop the oldest if over.
   - `git add` the task's `files:` + the renamed task file + the updated `story.md`.
   - `git commit -m "<type>(<story-slug>): <task-goal>"` — `<type>` is `feat` for features/plugin/server, `fix` for bugfix, `test` for tests, `chore` for i18n/docs.
6. **If the just-closed task was `layer: bugfix`**: look up `parent_task`, flip its status from `[blocked]` back to `[wip]`, commit that rename, and remind the user to re-run `/finish` on it.
7. **Never touch story-level status** — that's the story branch.
8. **Print the next task** in the story.

---

## Story branch

### Preconditions

- `$1` is a folder ending in `-[wip]`.
- **Every** task file ends in `-[done].md` or `-[skipped].md`. Any `[wip]` / `[pending]` / `[blocked]` → refuse and list them.
- All Acceptance checkboxes in `story.md` are ticked.
- The worktree's branch matches the story's expected branch.

### Steps

1. **Read the story and every task file.**
2. **Invoke `hex-architecture-reviewer`** via the Agent tool (`subagent_type: hex-architecture-reviewer`) with the story folder path. On `HEX-REVIEW FAIL` → stop, print violations, no rename. On `PASS` with scope-leak warnings → print and continue.
3. **Run the story's Demo / verification commands.** Stream output. Failure → stop.
4. **Spec-accuracy prompt, including bugfix-task count**:
   > *"Do the spec sections this story references (`<anchors>`) still match the implementation as shipped? Answer `yes` or `no + one-line reason`. This story spawned <N> bugfix tasks during execution."*
   - `N > 2` → tell the user the spec was too optimistic; a Deviation entry is required regardless.
5. **If `yes`** → tick the Spec-accuracy box in `story.md`.
6. **If `no` (or `N > 2`)** → tick + write the reason + append a dated `## Changelog` line to the referenced spec file.
7. **If the story's `## Questions surfaced` section is non-empty**, prompt the user to propagate each to the spec's §1 Resolved open questions table. Update the spec for approved items.
8. **Human final-approval gate**:
   - Prompt: *"Ready to merge `<branch>` into `main` locally? `approved` or `rejected + one-line reason`."*
   - `rejected` → append reason to story Notes, leave at `[wip]`, stop. Worktree stays.
9. **Rename + commit inside the worktree**:
   - Rename folder `NNN-<slug>-[wip]/` → `NNN-<slug>-[done]/`.
   - Set `status: done` and `finished: <YYYY-MM-DD>` in the story frontmatter.
   - `git add <renamed folder> <referenced spec if amended>` and commit: `feat(<story-slug>): close story`.
10. **Local merge into `main`** — never push, never involve any remote:
    - Compute the main repo path: `MAIN_REPO=$(dirname "$(git rev-parse --git-common-dir)")`.
    - Verify the main repo is on `main`: `git -C "$MAIN_REPO" rev-parse --abbrev-ref HEAD`. If not `main`, stop and tell the user to switch.
    - Verify the main repo working tree is clean: `git -C "$MAIN_REPO" status --porcelain`. Non-empty → stop with a clear message.
    - **Rebase the story branch onto latest `main`** (from inside the worktree): `git rebase main`. If rebase has conflicts → stop. Tell the user: *"Rebase conflict in `<file>`. Resolve inside the worktree, `git rebase --continue`, then rerun `/finish` on the story folder."* Leave the story at `[done]` in the worktree but unmerged.
    - **Fast-forward merge** from the main repo: `git -C "$MAIN_REPO" merge --ff-only <branch>`. `--ff-only` is safe because we just rebased. Failure here means the main repo moved during the rebase — surface the error and stop.
11. **Stabilize `main`** — right after the fast-forward:
    - Invoke `main-stabilizer` via the Agent tool (`subagent_type: main-stabilizer`) with the main repo path and the story slug.
    - `MAIN PASS` or `MAIN PASS (fixed <path>)` → continue to cleanup.
    - `MAIN FAIL` → **stop**. Print the agent's diagnosis. Do NOT proceed to cleanup; the worktree stays so the user can fix `main` before tearing anything down. The story is `[done]` and merged, but `main` is red — that's the only broken-ish state `/finish` is allowed to leave the user in, and only because the alternative is a silent cover-up.
12. **Cleanup prompt** (after `main-stabilizer` returns PASS):
    - Prompt: *"Merge complete. Remove worktree `.worktrees/<NNN>-<slug>` and delete local branch `<branch>`? `y` / `n` / `worktree-only`."*
    - Before any removal runs, tear down the preview environment: `bash "$MAIN_REPO/scripts/sdd/teardown-preview.sh" "$MAIN_REPO/.worktrees/<NNN>-<slug>"`. The script reads `.preview.env`, stops supabase scoped by its `project_id`, and frees the worktree's ports. Safe no-op if `.preview.env` is missing.
    - `y` → teardown, then `git -C "$MAIN_REPO" worktree remove .worktrees/<NNN>-<slug>` then `git -C "$MAIN_REPO" branch -d <branch>`.
    - `worktree-only` → teardown, remove the worktree; keep the branch.
    - `n` → leave both — no teardown (the user may still be running the preview).
13. **Unblock downstream**: if the story appears in any other story's `blocked_by:` under the same RFC phase, print those as *"now unblocked, consider `/start-story` on one of them."*

---

## Shared invariants

- **All work happens inside `.worktrees/<NNN>-<slug>/`.** Not in the main repo.
- **Status transitions are renames, always committed.**
- **No `[done]` without**: green validator (task) + human approval (both branches) + hex-review + demo + clean rebase + fast-forward merge (story).
- **Commits always have a conventional message type + story slug.**
- **`/finish` never touches any remote.** No push, no fetch, no pull, no PR creation, no `gh` calls. All merges are local `--ff-only`. The user pushes or opens PRs on their own time.
- **The story branch is fast-forward-merged into `main`**, never force-merged. A rebase conflict stops `/finish` and asks the user to resolve.
- **Inline fixes during validation stay inside `files:`** or they become a bugfix task.
- **Bugfix-task spawning is the only filesystem-creation `/finish` does.**
