---
spec: docs/specs/0005-contextual-help-panels-phase1.md
spec_sections:
  - "#54-qlmui-markdown-api"
  - "#74-shared-markdown-packagesui"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks:
  - 005-wire-integrations-first-consumer
blocked_by: []
---

# Create shared markdown component

## Goal

Add a `@qlm/ui/markdown` subpath export — a thin wrapper around `react-markdown` + `remark-gfm` with default prose classes — so help pages (and any future package needing rich text) can render markdown uniformly without reconfiguring `react-markdown` themselves.

## Scope

**In scope**
- `Markdown` component with props `Readonly<{ source: string; className?: string; components?: ReactMarkdownComponents }>`
- Default class chain: `prose prose-sm dark:prose-invert max-w-none` + targeted code-block overrides (`prose-pre:my-3`, `prose-pre:bg-muted/50`, `prose-code:text-xs`, `prose-code:before:content-[''] prose-code:after:content-['']`)
- `@qlm/ui/markdown` subpath export in `packages/ui/package.json`
- Storybook stories covering every GFM primitive and a narrow-container fixture matching the docs panel width

**Out of scope**
- Syntax highlighting (deferred to a later phase if a plugin needs it)
- Raw HTML passthrough (`rehype-raw` is not wired — plugins must opt in later if needed)
- Integrations consumers using the component → story 005

## Acceptance criteria

- [x] `import { Markdown } from '@qlm/ui/markdown'` works in a consumer package
- [x] `pnpm --filter @qlm/ui typecheck` green (modulo the pre-existing `reasoning.tsx` baseline error)
- [x] Storybook renders every story (`HelpPage`, `AllFeatures`, `NarrowContainer`, `Empty`)
- [x] Narrow-container story (360px wide) shows long code blocks scrolling horizontally and tables scrolling without breaking layout

## Tasks

Shipped files:

- `packages/ui/src/qlm/markdown.tsx` — **new**. `ReactMarkdown` + `remarkGfm` wrapper with default prose classes
- `packages/ui/src/qlm/markdown.stories.tsx` — **new**. 4 stories (`HelpPage`, `AllFeatures`, `NarrowContainer`, `Empty`)
- `packages/ui/package.json` — add `"./markdown": "./src/qlm/markdown.tsx"` entry to `exports`

## Demo / verification

```bash
pnpm --filter @qlm/ui typecheck
pnpm --filter @qlm/ui storybook
```

Walk `Design System / Markdown / *` — every story renders; narrow-container story fits inside its 360px frame.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
