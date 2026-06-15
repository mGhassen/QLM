---
story: ./story.md
status: pending
layer: features
files:
  - packages/features/user-tokens/src/components/generate-token-form.tsx
  - packages/features/user-tokens/src/components/generate-token-form.stories.tsx
  - packages/features/user-tokens/__tests__/generate-token-form.test.tsx
  - packages/features/user-tokens/src/components/tokens-settings-pane.tsx
  - packages/features/user-tokens/src/components/index.ts
---

# Build GenerateTokenForm (create pane state)

## Purpose

Inline two-column form (left form, right live preview) for creating a new token. Calls `useCreateUserTokenMutation`; on success emits `onCreated({ row, rawJwt })` to swap the parent reducer to `reveal`.

## Files

- `src/components/generate-token-form.tsx`:
  - Props: `Readonly<{ onCancel: () => void; onCreated: (output: CreateUserTokenOutput) => void; }>`.
  - `react-hook-form` + `zodResolver(CreateUserTokenInputSchema)`.
  - Layout: `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">` with form on the left, preview on the right.
  - Form fields:
    - Back-to-list link button at the top (`tokens:pane.create.back`) — calls `onCancel`.
    - Token name input (`tokens:pane.create.nameLabel`, `tokens:pane.create.namePlaceholder`).
    - Scopes — three checkboxes (read/write/admin) with help text from `tokens:scopes.<scope>Help`.
    - Expiration date — a simple date input that converts to Unix-seconds on submit. Default = today + 90 days.
  - Live preview pane (right column): renders the `<StatusChip status="active" />` (always active in preview), `<ScopePill>` per selected scope, and the formatted expiration date. Heading: `tokens:pane.create.preview.title`.
  - Footer: `Cancel` (calls `onCancel`) + `Create Token` (submits). Submit disabled when invalid OR mutation in-flight.
  - Error banner above the form when mutation rejects, copy from the error code → mapped to the `tokens:errors.*` key (notFound, alreadyRevoked, etc.) or `tokens:errors.generic` fallback.
  - Calls `useMarkSectionDirty('personal-tokens')(form.formState.isDirty)` so the Settings dialog's discard guard fires while the user has typed something.
- `src/components/generate-token-form.stories.tsx`:
  - `Pristine`, `Dirty`, `Submitting`, `Error`, `WithLongName` (preview overflow handling).
- `__tests__/generate-token-form.test.tsx`:
  - Submit button disabled until name + at least one scope provided.
  - Submit calls the mutation with the right payload; on success emits `onCreated({ row, rawJwt })`.
  - Cancel button fires `onCancel`.
  - Past-date submission attempt is blocked by the schema (no mutation call).
  - >365-day submission attempt is blocked by the schema.
  - Mutation error renders the inline banner with the right copy.
- `src/components/tokens-settings-pane.tsx` — replace task-001 create-state placeholder with the real `<GenerateTokenForm onCancel={() => dispatch({ type: 'cancel-create' })} onCreated={(output) => dispatch({ type: 'created', output })} />`.
- `src/components/index.ts` — extend with `GenerateTokenForm`.

## Acceptance

- [ ] No `Dialog` import in this file.
- [ ] `pnpm --filter @guepard/user-tokens typecheck` + `test` pass.
- [ ] `Readonly<Props>` on the component.
- [ ] Discard guard fires when the form is dirty (verified via test that uses the `useSettingsDirtyState` API).
- [ ] All copy localized via `tokens:pane.create.*` keys.

## Test plan

```
pnpm --filter @guepard/user-tokens typecheck
pnpm --filter @guepard/user-tokens test
```

## Storybook validation

- **Command**: `pnpm --filter @guepard/storybook-config storybook`
- **Story titles**: `UserTokens / GenerateTokenForm / Pristine`, `… / Dirty`, `… / Submitting`, `… / Error`, `… / With Long Name`
- **Expected visual outcome**: two-column layout — left form (back link, name input, three scope checkboxes, date input, footer with Cancel + Create), right preview (status chip + scope pills + formatted expiration). Submit button disabled in `Pristine` + `Submitting` shows spinner.

## Notes

- The scope checkboxes can use `@guepard/ui/checkbox` directly — no need to reuse `<FilterPopover>` here (different purpose).
- `useMarkSectionDirty` lives in `@guepard/settings-shell` (Story 010) — import via `@guepard/settings-shell` package; the user-tokens feature can dep on settings-shell.
- The date input deliberately uses native `<input type="date">` for phase 1; a polished date picker can land in a follow-up RFC.
