---
spec: docs/specs/0007-notebook-editor-phase1.md
spec_sections:
  - "#78-host-appsweb"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks:
  - 002-wire-notebook-plugin-and-run-path
  - 003-build-cell-chrome-and-divider
  - 004-build-tabbed-result-panel
  - 005-wire-datagrid-with-csv-export
  - 006-wire-datasource-provider-logos
  - 007-wire-notebook-header-and-tooltip-provider
blocked_by: []
---

# Wire Tailwind source scope

## Goal

Widen `apps/web/styles/global.css`'s Tailwind v4 `@source` directive list so utility classes used inside `packages/features/*` and `packages/apps/*` are scanned by the JIT compiler — without this, every other notebook story is invisible at runtime.

## Scope

**In scope**
- Replace the single `@source "../../../packages/features/auth/src"` directive with `@source "../../../packages/features"` to glob every feature package.
- Add `@source "../../../packages/apps"` so every shell-app plugin's classes are scanned.

**Out of scope**
- Per-package narrow scoping → globbing the parents is the policy in this RFC; new packages do not need a stylesheet edit.
- Tailwind v4 plugin upgrades, theme changes, custom variants → not touched.
- Removing the `@source "./"` directive → kept as-is so the host's own styles remain scanned.

## Acceptance criteria

- [x] `apps/web/styles/global.css` lists `@source "../../../packages/ui/src"`, `@source "../../../packages/features"`, `@source "../../../packages/apps"`, and `@source "./"`.
- [x] `pnpm web:dev` regenerates the stylesheet on next start with classes used inside `packages/features/notebook` and `packages/apps/notebook` (e.g. `pl-16`, `pr-12`, `mt-6`, `bg-[#ffcb51]`) emitted.
- [x] No regressions in stories that were already styled correctly (auth, datasources, etc.).

## Tasks

Shipped files:

- `apps/web/styles/global.css` — `@source` list updated as above.

## Demo / verification

```bash
pnpm web:dev
```

Open the notebook editor at `/notebook/{slug}` after stories 002–007 ship and confirm the cells container has a left/right gutter (this is the `pl-16 pr-12` from the cells container in `notebook-ui.tsx`). Without this story merged first, that padding is silently dropped.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec section (§7.8 Host) still matches the implementation as shipped.

Spec accurate: **yes**.
