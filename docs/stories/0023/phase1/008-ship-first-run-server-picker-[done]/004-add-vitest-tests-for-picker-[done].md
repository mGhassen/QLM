---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - apps/web/__tests__/components/desktop-first-run-picker.test.tsx
validation:
  kind: typecheck-only
---

# Add vitest tests for picker

Vitest + `@testing-library/react` component tests for `DesktopFirstRunPicker`.

## Done when

- [ ] New file `apps/web/__tests__/components/desktop-first-run-picker.test.tsx` covers:
  - Renders with Cloud option default-selected; Continue is enabled.
  - Selecting Custom hides Cloud's enabled-Continue and shows the URL input; Continue is disabled until URL is valid.
  - HTTPS URL → Continue enabled → click → `onSubmit` called with `https://...`.
  - HTTP URL → blur → `urlInvalid` error shown → Continue disabled → `onSubmit` NOT called.
  - Empty Custom URL → Continue disabled → `onSubmit` NOT called.
  - `mdmDefaultUrl` provided → matching radio pre-selected + MDM banner visible.
  - `isSubmitting === true` → Continue is disabled even when URL is valid.
- [ ] Test mounts with a `react-i18next` provider stub that returns the key as the rendered string (mirroring existing `apps/web` test patterns). No real locale-loading.
- [ ] `pnpm --filter web test apps/web/__tests__/components/desktop-first-run-picker.test.tsx` runs and passes.
- [ ] `pnpm typecheck` stays green.

## Notes

- Spec anchor: `#75-presentation-appsweb`. Tests confirm picker behaviour without driving the real Tauri runtime — the route's runtime gating is verified manually at `/finish` story-close time per the build+UI check.
- Use `screen.getByRole(...)` over `getByTestId` per the testing rule.
