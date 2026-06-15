---
spec: docs/specs/0005-contextual-help-panels-phase1.md
spec_sections:
  - "#33-user-flows-happy-path"
  - "#75-integrations-plugin--first-consumer-packagesappsintegrations"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks: []
blocked_by:
  - 001-add-docs-panel-context
  - 002-extend-app-registry-contract
  - 003-rewire-layout-docs-panel
  - 004-create-shared-markdown-component
---

# Wire integrations first consumer

## Goal

Prove the contextual help contract end-to-end by shipping AWS and GCP permission help pages inside the integrations plugin and wiring an auto-open effect so the docs panel opens the matching page when the user picks a provider in the create flow.

## Scope

**In scope**
- Two markdown files (`aws-permissions.md`, `gcp-permissions.md`) covering identity/regions, database discovery, snapshots, and VM provisioning — with inline links to official AWS and GCP docs
- Two thin React wrappers rendering `<Markdown source={rawMd} />` with Vite `?raw` imports
- `HelpPages` sibling export in `plugin-root.tsx` mapping `'aws-permissions'` and `'gcp-permissions'` to the wrapper components
- `useEffect` in `IntegrationsNewView` that calls `docs.open('aws-permissions' | 'gcp-permissions')` on provider change
- `vite-env.d.ts` declaring the `*.md?raw` module type
- `HelpPages` re-export from the plugin's `index.ts` for insurance (the registry grabs it from the eager import either way)

**Out of scope**
- Contextual close-on-unmount (explicit non-goal — the panel stays open until the user closes it)
- Per-locale help content
- Help pages for any other plugin

## Acceptance criteria

- [x] Clicking AWS in the provider picker auto-opens the docs panel to the AWS help page
- [x] Switching to GCP swaps the page in-place without closing the panel
- [x] Closing the panel via the topbar docs button keeps the docs panel closed until the next `docs.open(...)` call
- [x] Opening the panel does not fight with other shell state (assistant panel, tabs, project switcher)
- [x] `pnpm --filter @guepard/integrations typecheck` + `pnpm --filter web typecheck` green on top of the baseline

## Tasks

Shipped files:

- `packages/apps/integrations/src/help/aws-permissions.md` — **new**, full AWS IAM permissions reference with inline links to AWS docs
- `packages/apps/integrations/src/help/gcp-permissions.md` — **new**, full GCP roles / permissions reference with inline links
- `packages/apps/integrations/src/help/aws-permissions.tsx` — **new**, renders `<Markdown source={awsMarkdown} />`
- `packages/apps/integrations/src/help/gcp-permissions.tsx` — **new**, mirror
- `packages/apps/integrations/src/vite-env.d.ts` — **new**, `declare module '*.md?raw'`
- `packages/apps/integrations/src/plugin-root.tsx` — add `HelpPages = { 'aws-permissions': AwsPermissionsHelp, 'gcp-permissions': GcpPermissionsHelp }`; add `useEffect` in `IntegrationsNewView` calling `docs.open(...)` on provider change
- `packages/apps/integrations/src/index.ts` — re-export `HelpPages`

## Demo / verification

```bash
pnpm --filter @guepard/integrations typecheck
pnpm --filter web typecheck
pnpm web:dev   # with VITE_FEATURE_INTEGRATIONS=true
```

Navigate to a project → Integrations → New integration → click AWS. The docs panel on the right auto-opens and shows "Required AWS permissions" with inline links to AWS docs. Click GCP → the page swaps to "Required GCP permissions" without closing the panel. Click the topbar docs button → panel closes. Click AWS again → panel reopens on AWS.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
