# Model Routing

Every task has an implicit or explicit `model:` in its frontmatter. `/start-story` picks a default from `layer:`. Authors may override.

## Default matrix

| `layer:` | Model | Why |
| --- | --- | --- |
| `docs`, `i18n` | `haiku` | mechanical — JSON adds, markdown edits, barrel exports |
| `domain`, `adapter`, `server`, `shell`, `plugin`, `features`, `tests`, `db` | `sonnet` | workhorse — real code with real reasoning |
| `bugfix` | `sonnet` | needs to diagnose, not just scaffold |
| (RFC drafting / spec authoring / architecture reviews) | `opus` | high-reasoning, low-volume. Not a `layer:` — applies to `/draft-rfc` and `/rfc-to-spec` only |

## When to override

Override to `opus` only for:
- Debugging a runtime bug from a partial stack trace
- Cross-package refactors that touch 5+ files
- Security-sensitive code (auth, RLS, crypto, session tokens)

Override to `haiku` only for:
- Pure mechanical edits where the prompt is fully specified (rename X to Y, add these 3 keys to this JSON)

Do not override for "I want it faster" — use `sonnet` with a tighter prompt.

## Subagent inheritance

When `/finish` spawns a subagent (e.g. `ui-validator`, `hex-architecture-reviewer`), the subagent uses the task's `model:`. Agents may also declare their own default in their `.claude/agents/*.md` file; the task-level `model:` always wins.

## Hard invariants

- **No `model:` in the task → `/start-story` assigns one.** Never leave a task with an ambiguous model.
- **Opus is never the default.** It's opt-in by override.
- **This rule file stays under 40 lines.** If you're adding a fifth row to the matrix, the matrix is wrong.
