---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/apps/org-settings/src/plugin-root.tsx
  - packages/apps/org-settings/src/sections/billing.tsx
  - packages/apps/org-settings/src/sections/billing.stories.tsx
  - packages/apps/org-settings/src/sections/usage.tsx
  - packages/apps/org-settings/src/sections/usage.stories.tsx
  - packages/apps/org-settings/package.json
  - apps/web/src/lib/i18n/locales/en/org-settings.json
  - packages/shell-runtime/src/resources/orders.ts
  - packages/shell-runtime/src/resources/usage.ts
  - packages/shell-runtime/src/resources/organizations.ts
  - packages/shell-runtime/src/client.ts
  - packages/apps/org-settings/src/sections/members.tsx
  - packages/apps/org-settings/src/sections/members.stories.tsx
  - packages/ui/src/qlm/entity-list/entity-list-toolbar.tsx
  - packages/ui/src/qlm/entity-list/entity-list-page.tsx
  - packages/features/billing/src/components/remaining-balance.tsx
validation:
  kind: typecheck-only
---

# Migrate org-settings Billing and Usage sections

Adds Billing and Usage sections to `org-settings`, reusing `@qlm/features/billing` components for Billing and migrating the deleted `/org/$slug/usage` route content inline into Usage (no new feature package).

## Done when

- [ ] `sections/billing.tsx` composes the existing billing components (balance, invoice history, buy credits, etc.) from `@qlm/features/billing/components` against the current org.
- [ ] `sections/usage.tsx` inlines the usage panel content from the pre-deletion `/org/$slug/usage` route, wired through the existing shell-runtime usage resource.
- [ ] Plugin-root mounts all four sections (`general`, `members`, `billing`, `usage`) in that order.
- [ ] Storybook stories cover default, loading, and error states for each section.
- [ ] All user-facing strings go through `t(...)` with keys added under `org-settings` namespace.
- [ ] `pnpm typecheck` is green.

## Notes

- Usage content is migrated inline — creating a `@qlm/features/usage` package is explicitly out of scope (the deleted route was ~286 lines, manageable inline).
- Pull pre-deletion bodies via `git show 657158b^:apps/web/src/routes/org/$slug/{billing,usage}.tsx`.
