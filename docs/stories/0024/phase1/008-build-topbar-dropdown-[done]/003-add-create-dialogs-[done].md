---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/shell-topbar/src/create-project-dialog.tsx
  - packages/features/shell-topbar/src/create-org-dialog.tsx
  - packages/features/shell-topbar/src/create-project-dialog.stories.tsx
  - packages/features/shell-topbar/src/create-org-dialog.stories.tsx
  - packages/features/shell-topbar/src/slugify.ts
  - packages/features/shell-topbar/src/index.ts
  - packages/features/shell-topbar/package.json
  - pnpm-lock.yaml
validation:
  kind: typecheck-only
---

# Add create-project + create-org dialogs

Two modal dialogs driving project / organization creation. Fields: `name` (required, min 1), `slug` (auto-derived from `name` on first typing, becomes dirty-tracked once the user edits it). Submit disabled while invalid; disabled + spinner while submitting. On submit, fires a parent-provided `onSubmit(input)` promise — state + navigation live in task 004's composite.

## Done when

- [ ] `create-project-dialog.tsx` exports `CreateProjectDialog` with props `{ open, onOpenChange(next: boolean), onSubmit(input: { name; slug }): Promise<void>, serverError?: string }`.
- [ ] `create-org-dialog.tsx` exports `CreateOrgDialog` with the same prop shape.
- [ ] Validation: `name` non-empty (`.min(1)`), `slug` matches `^[a-z0-9-]+$` and non-empty. Auto-derive `slug` from `name` via a small `slugify(name)` helper inside the module (`lowercase → replace [^a-z0-9] with '-' → trim '-' → truncate 48 chars`). Stop auto-deriving the moment the user edits the slug field.
- [ ] Submit disabled while invalid OR while `isSubmitting`. Show spinner on submit button. Server error (via `serverError` prop) renders as inline alert above the submit row.
- [ ] Dialog uses `@guepard/ui` Shadcn `Dialog` + `react-hook-form` + `@hookform/resolvers/zod`. All labels / placeholders / errors go through `useTranslation('shell')` — reuse the existing keys from story 002 (add only what's strictly missing).
- [ ] Storybook stories: `Idle`, `Submitting`, `ServerError`, `PrefilledFromTrigger` (seed `defaultValues`).
- [ ] `pnpm typecheck` green; `pnpm --filter @guepard/shell-topbar test` green (no new tests required here — behavior is mostly react-hook-form + Zod, which the host covers in 004).

## Notes

- The dialog doesn't know about `shell.projects.create` / `shell.organizations.create`. Keep `onSubmit` as the single contract; the composite wires it to the mutation.
- When submission succeeds, the parent closes the dialog by flipping `open` → `false`. No internal auto-close after `onSubmit` resolves — keeps the close decision with the caller (they may want to chain a navigation first).
- Don't add ESLint disables to force `react-i18next/Trans` — use `@guepard/ui/trans` if any rich-text copy is needed. Pure `t()` calls are fine via `react-i18next`.
