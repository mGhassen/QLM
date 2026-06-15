---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - apps/web/src/components/desktop-first-run-picker.tsx
validation:
  kind: typecheck-only
---

# Build first-run picker component

Build the presentational picker component that the route in task 003 will mount. Pure UI: takes props in, calls callbacks out — no Tauri-command calls itself, no `getAppConfig`/`setAppConfig` invocation.

## Done when

- [ ] New file `apps/web/src/components/desktop-first-run-picker.tsx` exports a `DesktopFirstRunPicker` component with `Readonly<{ initialUrl?: string; mdmDefaultUrl?: string; isSubmitting?: boolean; onSubmit: (serverUrl: string) => void }>` props.
- [ ] Layout: full-screen flex-centered container, dark background, centred Shadcn `Card`. Two `RadioGroup` options (Cloud / Custom server URL). Cloud is default-selected unless `initialUrl` is set to a non-cloud URL or `mdmDefaultUrl` is set.
- [ ] Selecting "Custom server URL" reveals a Shadcn `Input` with a TLS validator firing on `onBlur` (and on form submit). HTTPS-only check: `new URL(value).protocol === 'https:'`. Empty / non-URL → inline `urlInvalid` error.
- [ ] When `mdmDefaultUrl` is provided, the matching radio option is pre-selected and a Shadcn `Alert` (or muted banner div) shows `t('desktop.firstRun.mdmBanner')`.
- [ ] "Continue" CTA disabled until selection is valid (Cloud always valid; Custom requires non-empty + HTTPS); on click → `onSubmit(serverUrl)`. CTA shows the disabled state when `isSubmitting === true`.
- [ ] All visible strings use `t('desktop.firstRun.*')` from task 001's namespace via `useTranslation()`. ESLint rule `@guepard/ui/trans` respected.
- [ ] Component uses Shadcn primitives from `@guepard/ui` (Card, RadioGroup, Input, Button, Alert) and `cn` from `@guepard/ui/utils`. No raw HTML for interactive elements.
- [ ] `pnpm typecheck` stays green; `pnpm lint` stays green for `apps/web`.

## Notes

- Spec anchor: `#75-presentation-appsweb`, `#11-i18n-key-map`.
- Per spec §7.5, this is host-specific UI living in `apps/web/src/components/`, NOT a `packages/features/*` package. Storybook is consequently NOT mandatory (the testing rule's Storybook gate applies to `packages/ui`/`features`/`apps`, not `apps/web`).
- Keep the component small (under ~150 lines) — radio + conditional input + submit button. Lift the form state with `useState`, no `react-hook-form` needed for two fields.
