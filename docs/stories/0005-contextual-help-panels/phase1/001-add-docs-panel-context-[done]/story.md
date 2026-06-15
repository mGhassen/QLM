---
spec: docs/specs/0005-contextual-help-panels-phase1.md
spec_sections:
  - "#53-docspanelcontext-api"
  - "#71-shell-runtime-packagesshell-runtime"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks:
  - 002-extend-app-registry-contract
  - 005-wire-integrations-first-consumer
blocked_by: []
---

# Add docs panel context

## Goal

Add a pure-state `DocsPanelContext` to `@guepard/shell-runtime` with a `DocsPanelProvider` and a strict `useDocsPanel()` hook so plugins can open and close the right-sidebar docs panel without coupling to the host.

## Scope

**In scope**
- `DocsPanelContextValue` — `activePageId / isOpen / open(pageId) / close()`
- `DocsPanelProvider` — owns `activePageId` state, bridges `open/close` to an optional `onOpenChange` callback
- `useDocsPanel()` — throws if called outside the provider
- Barrel exports from `@guepard/shell-runtime`

**Out of scope**
- App registry contract extension → story 002
- Layout rewrite → story 003
- Shared markdown component → story 004
- Integrations plugin wiring → story 005

## Acceptance criteria

- [x] `DocsPanelProvider`, `useDocsPanel`, `DocsPanelContextValue`, and `DocsPanelProviderProps` are exported from `@guepard/shell-runtime`
- [x] `useDocsPanel()` throws a descriptive error when used without a surrounding provider
- [x] Opening a page via `open('foo')` sets `activePageId = 'foo'` and fires `onOpenChange(true)` exactly once
- [x] `close()` sets `activePageId = null` and fires `onOpenChange(false)`
- [x] `pnpm --filter @guepard/shell-runtime typecheck` green

## Tasks

Shipped files:

- `packages/shell-runtime/src/docs-panel-context.tsx` — **new**. `DocsPanelContextValue`, `DocsPanelProvider`, `useDocsPanel()`
- `packages/shell-runtime/src/index.ts` — re-export `DocsPanelProvider`, `useDocsPanel`, `DocsPanelContextValue`, `DocsPanelProviderProps`

## Demo / verification

```bash
pnpm --filter @guepard/shell-runtime typecheck
```

Importing `useDocsPanel` from `@guepard/shell-runtime` type-checks in a consumer package.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
