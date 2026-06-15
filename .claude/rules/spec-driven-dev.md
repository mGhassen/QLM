# Spec-Driven Development

Four layers, five statuses, five commands, five templates, two agents, one worktree per wip story. These caps are load-bearing.

## Layers

1. **RFC** — `docs/rfcs/<id>-<slug>.md` — *why*.
2. **Spec** — `docs/specs/<id>-<slug>-phase<N>.md` — *what & how*, one phase at a time.
3. **Story** — `docs/stories/<id>-<slug>/phase<N>/NNN-verb-slug-[status]/story.md` — a vertical slice, 1–3 days.
4. **Task** — flat inside the story folder, `NNN-verb-slug-[status].md` — atomic, ~1–4 hours. Each task has executable `validation:` and explicit `model:`.

`<slug>` is the RFC's short slug (e.g. `global-shell-ui`). It appears at every path layer so `grep` / file-open by keyword works from any layer and so the tree is self-describing without cross-referencing the RFC index. No fifth layer.

## Statuses

`[pending]` / `[wip]` / `[blocked]` / `[done]` / `[skipped]`. Status change = rename = commit (by `/finish`).

`[blocked]` is reserved for a task whose `ui-validator` returned `BUG_COMPLEX`, pointing at an auto-spawned bugfix task.

## Slash commands

- `/draft-rfc` — iterate on a draft RFC.
- `/rfc-to-spec` — scaffold a phase spec.
- `/spec-to-stories` — generate story folders.
- `/start-story` — wip + tasks + **worktree** (`.worktrees/<NNN>-<slug>/`) on branch `story/<rfc-id>-<rfc-slug>/phase<N>/<NNN>-<slug>`.
- `/finish` — close a wip task (validator + human approval + commit) or story (hex review + demo + rebase + local fast-forward merge to `main` + worktree cleanup). **No remote interaction ever.**

## Templates and agents

Templates (`.claude/templates/`): `rfc.md`, `spec.md`, `story.md`, `task.md`, `bugfix-task.md`.
Agents (`.claude/agents/`): `ui-validator`, `hex-architecture-reviewer`. Invoked only by `/finish`.

## Hard caps

| Thing                                            | Cap           |
| ------------------------------------------------ | ------------- |
| Stories per phase                                | 4 to 12       |
| Tasks per story (excludes `layer: bugfix`)       | 1 to 8        |
| Bugfix tasks per story before it's a red flag    | 2             |
| Concurrent `[wip]` stories per phase per person  | exactly 1     |
| Concurrent worktrees                             | one per wip story |
| Task `## Notes` bullets                          | 3             |
| This file                                        | under 80 lines|

## Invariants

- **RFCs are immutable after `/rfc-to-spec`.** Amendments go in `## Amendments`.
- **Specs are frozen while any story in the same phase is `[wip]`.**
- **Stories reference spec sections by markdown anchor.**
- **Story folders are flat.**
- **Phase N+1 stories don't exist until the phase-N+1 spec exists.**
- **Every task has `model:` and `validation:`.** Enforced by `/start-story`.
- **All wip work happens inside `.worktrees/<NNN>-<slug>/`.** Never in the main repo.
- **`/start-story` forks from a clean `main`.** Uncommitted changes block entry.
- **`/start-story` refuses when `main`'s `pnpm check` is red.** Run it from `main` before creating the worktree; a story must not inherit a broken baseline. Fix `main` first, commit, then start the story.
- **No `[done]` without**: green validator (task) + hex-review PASS + demo green + human `approved` (story branch only; task branch is validator-only).
- **`/finish` commits every status transition.** Conventional message with story slug.
- **`main` receives story commits only via local fast-forward merge** performed by `/finish` after human approval. `/finish` never pushes, never fetches, never touches a remote. PRs are the user's manual choice if/when they want one.
- **Inline fixes during validation stay inside the task's `files:`.** Otherwise `BUG_COMPLEX` → bugfix task, which is a carve-out from the 1–8 cap.
- **UI validation is agent + human, in parallel.** `ui-validator` PASS is necessary but not sufficient.

## Red flags

- This file past 80 lines → revert.
- Stories over 3 days repeatedly → slicing is wrong.
- `/finish` story branch fires much less often than task branch → stories too big.
- `/draft-rfc` past round 4 with fundamental questions → RFC too ambitious.
- `>2` bugfix tasks in one story → spec too optimistic; log a Deviation.
- More than one `.worktrees/*` folder at once → you're violating the per-phase wip cap.
