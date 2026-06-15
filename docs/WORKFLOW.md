# Workflow

This repo uses a four-layer spec-driven workflow. All layers are plain markdown. Rules and caps live in [`.claude/rules/spec-driven-dev.md`](../.claude/rules/spec-driven-dev.md).

## The four layers

| Layer  | Where                                                              | Owns                                      | Size            |
| ------ | ------------------------------------------------------------------ | ----------------------------------------- | --------------- |
| RFC    | `docs/rfcs/<id>-<slug>.md`                                         | *Why*, phase-aware, conceptual            | 1 per feature   |
| Spec   | `docs/specs/<rfc-id>-phase<N>.md`                                  | *What & how*, one phase at a time          | 1 per phase     |
| Story  | `docs/stories/<rfc-id>/phase<N>/NNN-verb-slug-[status]/story.md`    | A vertical slice that ships 1–3 days' value | 4–12 per phase  |
| Task   | Flat inside the story folder: `NNN-verb-slug-[status].md`          | Atomic implementation step                | 1–8 per story   |

## Status suffix

Story folders and task files carry their status in the filename: `[pending]` / `[wip]` / `[blocked]` / `[done]` / `[skipped]`. Status transitions are git renames, one commit each.

`ls docs/stories/<rfc-id>/phase<N>/` is the dashboard. `grep -r '\[wip\]' docs/stories/` is the query engine.

## Five slash commands

1. `/draft-rfc <rfc-file>` — iterate on a draft RFC via Q&A until it is ready for `/rfc-to-spec`. Does not use plan mode; edits the RFC in place after each round.
2. `/rfc-to-spec <rfc-id> <phase>` — scaffold a phase spec from a finished RFC.
3. `/spec-to-stories <spec-file>` — scaffold story folders from a spec.
4. `/start-story <story-folder>` — auto-generate tasks, rename folder to `[wip]`, load the story as focus.
5. `/finish <task-file | story-folder>` — close a wip task or a wip story. Dispatches on the path suffix. Task path → runs the test plan and renames to `[done]`. Story path → runs the demo, enforces the spec-accuracy check, renames to `[done]`, drafts a PR body.

Everything else is handled by plain file editing and git. No CLI, no linter, no CI job validates this tree.

## The cycle

```
Draft ──/draft-rfc──▶ RFC ──/rfc-to-spec──▶ Spec ──/spec-to-stories──▶ Stories ──/start-story──▶ Tasks
                                                                                                   │
                                                                        ┌──/finish (task)──◀───────┘
                                                                        ▼
                                                                  (repeat tasks)
                                                                        │
                                                                        ▼
                                                                  /finish (story)  ──▶  PR + next unblocked story
```

## Caps at a glance

- 4 layers, 5 statuses, 5 commands, 4 templates — exact counts.
- 4–12 stories per phase, 1–8 tasks per story, 1 wip story per phase per person.
- `## Notes` in a task caps at 3 bullets.
- `spec-driven-dev.md` caps at 80 lines.
- Zero external tooling, zero CI enforcement.

Outside any cap → revisit the spec, don't stretch the cap.
