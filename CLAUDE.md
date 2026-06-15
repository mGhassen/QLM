# CLAUDE.md

This file provides guidance to Claude Code when working with this repository. The rules are split by concern — each file below is enforced on every change.

## Rules by concern

@.claude/rules/commands.md
@.claude/rules/architecture.md
@.claude/rules/hexagonal-architecture.md
@.claude/rules/clean-code.md
@.claude/rules/i18n.md
@.claude/rules/conventions.md
@.claude/rules/database.md
@.claude/rules/testing.md
@.claude/rules/security.md
@.claude/rules/spec-driven-dev.md
@.claude/rules/validation.md
@.claude/rules/model-routing.md

Agents available to `/finish`: `ui-validator` (runs UI smoke + e2e, fixes inline or spawns bugfix task), `hex-architecture-reviewer` (enforces hexagonal + i18n + RLS on story close), and `main-stabilizer` (runs `pnpm check` on `main` post-merge and applies narrow safe auto-fixes, else blocks cleanup). Defined under `.claude/agents/`.

## Non-negotiable principles

1. **Hexagonal architecture** — `packages/domain` is pure. Adapters implement ports. Apps use `useShell()` from `@guepard/shell-runtime`, never domain services directly. See `@.claude/rules/hexagonal-architecture.md`.
2. **Clean code** — meaningful names, small functions, no dead code, no speculative abstractions. See `@.claude/rules/clean-code.md`.
3. **i18n everywhere** — no hardcoded user-facing strings. Use `t(...)` and `@guepard/ui/trans`. See `@.claude/rules/i18n.md`.
4. **Row Level Security always** — every new table has RLS enabled with explicit policies. See `@.claude/rules/database.md`.
5. **Run `pnpm typecheck` after every change** — catches most issues before runtime. See `@.claude/rules/commands.md`.
6. **Security by design** — respect SOC 2 / ISO rules when touching auth, identity, secrets, or data lifecycle. Compliance evidence lives in Vanta, not in this repo. See `@.claude/rules/security.md`.

## When in doubt

- Read the relevant rule file before implementing.
- Prefer reusing existing components, hooks, and services over creating new ones.
- If a rule seems wrong for your change, flag it with the user — do not silently violate it.
