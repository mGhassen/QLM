---
story: ./story.md
status: done
layer: plugin
model: sonnet
files:
  - apps/web/src/shell/app-registry.ts
validation:
  kind: typecheck-only
---

# Register new apps in registry — and hide `project.overflow` apps from the sidebar

Skipped on first pass because the registry's glob already matches the new manifests. Reopened after visual verification on the preview app: both settings apps appeared in the project sidebar under a "SETTINGS" group, contradicting the RFC's "neither settings app appears in the project sidebar — the topbar dropdown is their sole entry point" rule (RFC §3.1, spec §10).

Root cause: `AppRegistry.getNavGroups()` filters out `projectTopLevelAppBucketId === 'dashboard'` but does not honor `nav.slot === 'project.overflow'`. The slot field is currently ignored by navigation rendering. The scaffold manifests (`project-settings`, `org-settings`) both set `nav.slot: 'project.overflow'`, but also set `projectTopLevelAppBucketId: 'project-settings'`, so they ended up in the new "SETTINGS" sidebar bucket.

## Done when

- [x] `AppRegistry.getNavGroups()` excludes apps with `nav.slot === 'project.overflow'` so they are reachable only via dedicated hosts (topbar dropdown — story 008).
- [x] `project-settings` and `org-settings` no longer appear in the project sidebar on `/prj/$projectSlug/*` routes (manually verified on the live preview at http://localhost:3100).
- [x] `pnpm typecheck` green (49/49).

## Notes

- Glob auto-discovery still works — the manifests are loaded, just not surfaced.
- Task 004's original `files:` (`apps/web/src/shell/app-registry.ts`) was the right scope; the skip was wrong.
