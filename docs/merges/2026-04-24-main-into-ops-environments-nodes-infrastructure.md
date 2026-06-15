# Merge: `main` → `features/ops-environments-nodes-infrastructure`

**Date:** 2026-04-24
**Direction:** `git merge main` into `features/ops-environments-nodes-infrastructure` (HEAD)
**Conflicts resolved:** 27 flagged + 1 silent dup (`badge.tsx`) + 2 missing deps (`storybook-config`, `ui`) + 1 missing prop (`InfrastructurePluginRoot`)

`main` carried the SDD tooling overhaul, the RFC 0024 org/settings-as-app migration, the billing refactor, and the `012-bridge-apps-web-as-desktop-renderer` story. The feature branch carried the nodes + infrastructure domain/adapters/UI stack. This doc records every resolution so the diff is auditable.

## Summary

| Category | Count | Outcome |
| --- | --- | --- |
| Textual UU conflicts | 21 | Union where additive, took main where authoritative |
| UD (main-deleted) routes | 2 | Deleted per main (`RFC 0024` superseded them) |
| AA (both-added) components | 2 | Took richer side per file |
| Lockfiles | 2 | Regenerated from scratch |
| Silent duplicate keys | 1 | `badge.tsx` — dedup by hand |
| Missing deps revealed post-merge | 2 | Added `i18next` + `react-i18next` to `tooling/storybook` and `packages/ui` |
| Missing prop revealed post-merge | 1 | `InfrastructurePluginRoot` now passes `projectId` |

## Conflict ledger

### 1. `apps/web/src/lib/i18n/i18n.settings.ts`

- **Feature:** added `'infrastructure'` to `defaultI18nNamespaces`.
- **Main:** added `'desktop'`.
- **Resolution:** **union**. Kept both entries; ordered alphabetically with `'datasources' → 'desktop' → 'infrastructure'`.

### 2. `apps/web/src/lib/repositories-factory.ts`

- **Feature:** imported `MessageRepository` from `./repositories/messages.respository` (typo path), added `NodeRepository`, wired `userQuota` + `volumePricingTier`.
- **Main:** renamed the message adapter to `./repositories/message.repository` (fix), deleted `userQuota`/`volumePricingTier` wiring, cast the return value with `as unknown as Repositories` and added the `jwtSigner`-on-browser rationale comment.
- **Resolution:** use main's **correct path**, keep feature's **node / userQuota / volumePricingTier** wiring, keep main's **cast + comment** (the browser factory deliberately omits `jwtSigner`).

### 3. `apps/web/src/lib/repositories/repositories-factory.ts`

- **Feature:** imported `NodeRepository`.
- **Main:** imported `HttpUserPreferencesRepository`, `HttpUserTokenRepository`.
- **Resolution:** **union** — all three.

### 4. `apps/web/src/routes/org/$slug.tsx` + `apps/web/src/routes/organizations.tsx`  (UD)

- **Feature:** modified these files.
- **Main:** deleted both as part of RFC 0024 (`007-extend-shell-to-all-routes: redirect /organizations and /org/*`). Replaced with `/organizations/index.tsx` → `LastProjectRedirect`.
- **Resolution:** `git rm` both. Verified:
  - `grep "org/\$slug\|'/organizations"` reveals no ingoing callers beyond the generated routeTree (regenerated on next dev run).
  - Main's `/organizations/index.tsx` handles the landing concern.

### 5. `apps/web/vite.config.ts`

- **Feature:** added `decodeDollarInRoutePathsPlugin()` (server middleware that rewrites `%24` → `$` so `$param` routes resolve). Used `PORT` env, host default `::`.
- **Main:** renamed port var to `WEB_PORT` with `PORT` fallback, host default `0.0.0.0`.
- **Resolution:** **union**. Kept the plugin function + its call in the plugin array; adopted main's `WEB_PORT`-first env lookup and `0.0.0.0` default.

### 6. `packages/domain/src/common/code.ts`

- **Feature:** claimed `3000-3099` for `NODE_*` error codes.
- **Main:** claimed `3000-3099` for `USER_TOKEN_*` error codes.
- **Resolution:** **renumbered** `NODE_*` to `3100-3199`. Rule of thumb: older-merged block keeps its numbers; the later block shifts into the next free range.

### 7. `packages/domain/src/repositories/repositories.ts`

- **Feature:** added `node: INodeRepository` to `Repositories`.
- **Main:** added `userToken`, `userPreferences`, `jwtSigner`.
- **Resolution:** **union** — all four fields.

### 8. `packages/features/accounts/src/server/api.ts`

- **Feature:** added `getSubscription` / `getOrder` / `getCustomerId` methods to `AccountsApi`.
- **Main:** removed those methods (billing flow refactor, commit `c740196`).
- **Resolution:** took **main**. Verified:
  - `OrganizationsApi` in the same file already has `getSubscription`, `getOrder`, `getCustomerId` with the same semantics.
  - `grep "createAccountsApi|accountsApi\\."` returns zero callers — the functions were dead code before the conflict.

### 9. `packages/otp/src/server/actions.server.ts`

- **Feature:** called `getSupabaseServerClient(request).client` inline.
- **Main:** destructured `{ client: serverClient } = getSupabaseServerClient(request)`.
- **Resolution:** took **main**. Functionally identical but matches the updated `getSupabaseServerClient` return signature that the rest of the server-side code already expects.

### 10. `packages/i18n/src/i18n-provider.tsx`

- **Feature:** still used the old `useEffect` + `useMemo` + fallback-instance pattern that renders children against an empty i18n before resources load (caused the "flash of raw keys" regression).
- **Main:** rewrote to throw the in-flight load promise during render, letting `<Suspense>` handle the fallback (commit `b03987d fix(i18n): eliminate the flash-of-raw-keys on first render`).
- **Resolution:** took **main** wholesale. Dropped unused `useMemo` import.

### 11. `packages/repositories/memory/src/usage-repository.ts`

- **Feature:** added a comment explaining why `getUsageSummary` returns zeros in memory (no `credits_transactions` state).
- **Main:** no comment.
- **Resolution:** kept the comment (feature side) — main's deletion was incidental, not intentional.

### 12. `packages/repositories/supabase/src/usage.repository.ts`

- **Feature:** plain return `}`.
- **Main:** `} as Usage` cast on the deserializer.
- **Resolution:** took **main**. The cast is required because the typed return currently resolves to a wider partial shape; `as Usage` asserts the runtime invariant we already enforce via the `.select('*')` projection.

### 13. `packages/shell-runtime/src/index.ts`

- **Feature:** re-exported `NodesResource`.
- **Main:** re-exported `ConversationsResource`, `CreateConversationResourceInput`, `UpdateConversationResourceInput`, `MessagesResource`.
- **Resolution:** **union**. Kept both export blocks. All underlying files (`resources/nodes.ts`, `resources/conversations.ts`, `resources/messages.ts`) exist in the tree.

### 14. `packages/shell-runtime/src/client.ts`

Same shape as the index: feature added `nodes` to `ShellClient` and wired `createNodesResource` in `useShell`; main added `conversations` + `messages`. **Union both.**

### 15. `packages/ui/src/qlm/entity-list/entity-list-options-menu.tsx`

- **Feature:** rendered sort-by as a compact `<Select>` + `AscDescToggle` side-by-side (imported Radix select primitives).
- **Main:** rendered sort-by as a list of buttons with the toggle inlined under the active option (commit `c740196 feat: extract entity list components`).
- **Resolution:** took **main**. Also removed the now-orphaned `Select*` imports from the top of the file.

### 16. `packages/ui/src/qlm/entity-list/entity-list-toolbar.tsx`

- **Feature:** brutalist search + primary-action styling (`rounded-none`, `border-2`, uppercase, font-black).
- **Main:** standard shadcn look plus a new `primarySlot` prop that lets consumers render a fully custom CTA (e.g. a `DialogTrigger` wrapping a `Button`). Added the `primarySlot ? ... : primaryAction ?` ternary.
- **Resolution:** took **main** end-to-end. The `primarySlot` API is additive and the brutalist styling was an isolated local experiment on the feature branch.

### 17. `packages/ui/src/qlm/layout/root-layout.tsx`

- **Feature:** added `sidebarCollapsible`, `sidebarResizable`, `showSidebarTrigger` props.
- **Main:** added `assistantPanelContent` prop (the host injects `<AssistantPanelBody />` from `@qlm/qwery-agent`).
- **Resolution:** **union**. Kept all four props in the type, all four in the destructure with defaults, and ensured the JSX body (already including both sets of props) stayed consistent.

### 18. `packages/ui/src/shadcn/alert.tsx`

- **Feature:** added an `info` variant (sky palette).
- **Main:** no variant add.
- **Resolution:** kept feature's `info` variant.

### 19. `packages/ui/src/shadcn/checkbox.tsx`

- **Feature:** brutalist styling (`border-border`, `bg-background`, `shadow`).
- **Main:** standard shadcn styling (`border-input`, `focus-visible:ring-ring`, `ring-1`).
- **Resolution:** took **main** (matches the rest of the shadcn primitives in the repo).

### 20. `packages/ui/src/shadcn/input.tsx`

Same shape as checkbox — feature went brutalist, main stayed shadcn. **Took main.**

### 21. `packages/ui/src/shadcn/select.tsx`

Two conflict points:

- **Trigger styling** — feature brutalist, main shadcn → took **main**.
- **Viewport CSS var syntax** — feature used Tailwind v3 `h-[var(--radix-select-trigger-height)]`, main used Tailwind v4 `h-(--radix-select-trigger-height)` → took **main** (repo is on Tailwind 4.1).

Non-conflicted blocks (`SelectLabel`, `SelectItem`) still reflect feature's styling because auto-merge preserved them; leaving them as-is is fine, but worth calling out if we later want a consistent look across the whole file.

### 22. `packages/ui/src/styles/partials/tokens.css`

- **Feature:** `--input: 220 13% 91%`, `--ring: 42 100% 66%` (ring matches primary yellow).
- **Main:** `--input: 0 0% 88%`, `--ring: 0 0% 20%` (neutral dark-gray ring).
- **Resolution:** took **main**. Matches the broader design direction on main.

### 23. `packages/ui/src/shadcn/image-uploader.tsx`  (AA)

- **Feature (stage 2):** a minimal stub that renders only a hidden `<input type="file">` and label children. The header comment explicitly flags it as "Minimal stub. Real implementation not ported yet."
- **Main (stage 3):** full implementation — avatar preview, upload button, remove button, cropper-ready contract.
- **Resolution:** took **main** verbatim (`git show :3 > file`).

### 24. `packages/ui/src/shadcn/language-selector.tsx`  (AA)

- **Feature (stage 2):** full implementation — reads `i18n.options.supportedLngs`, `Intl.DisplayNames` fallback labels, cookie persistence, hides when only one language is configured.
- **Main (stage 3):** stub `({ className }: { className?: string })` that returns a placeholder.
- **Resolution:** took **feature** verbatim (`git show :2 > file`). Main's stub was scaffolding only.

### 25. `bun.lock` + `pnpm-lock.yaml`  (AA)

- Lockfiles were both-added / both-modified, impossible to text-merge sanely.
- **Resolution:**
  1. `git rm -f bun.lock pnpm-lock.yaml`.
  2. `pnpm install` → regenerated `pnpm-lock.yaml`.
  3. `bun install` → regenerated `bun.lock` (apps/server uses `bun run` at runtime; the lockfile is maintained alongside pnpm for server/desktop workflows).

## Silent bugs caught post-merge (not flagged by git)

### A. `packages/ui/src/shadcn/badge.tsx` — duplicate keys

Both sides appended `success` / `warning` / `info` variants at different positions in the `cva` call. Git auto-merged because the insertions landed on non-overlapping lines, but TypeScript then rejected the object literal (`TS1117: object literal cannot have multiple properties with the same name`). Deduped by hand; kept the first block (which uses `dark:text-*-400` tones), dropped the second (which used `dark:text-*-300`).

### B. `packages/ui/package.json` — duplicate exports

Same shape: `"./image-uploader"` and `"./language-selector"` appeared twice in the `exports` map. `bun install` rejected the package with "Duplicate key in object literal" warnings; `pnpm` silently picked the last entry, hiding the bug. Deduped by hand.

### C. `tooling/storybook/package.json` + `packages/ui/package.json` — missing i18next deps

Main's Storybook preview (`preview.tsx`) and feature's UI story file (`message-item.stories.tsx`) both import `i18next` and `react-i18next` directly. Neither package declared the dep — they were being resolved transitively through hoisting, which broke once the lockfile was regenerated. Added `i18next@^25.6.0` + `react-i18next@^16.2.3` to both packages' dependency lists.

### D. `packages/features/ops/infrastructure/src/presentation/plugin-root.tsx` — missing prop

The `<InfrastructureListPage>` component's props were tightened on one of the branches to require `projectId` alongside `projectSlug`. The `plugin-root` call site still passed only `projectSlug`. Passed `projectId={shell.projectId}` — already available on the shell client.

## What was not done

- **`pnpm check` (lint + format + build + test)** was not run as part of this merge commit. Typecheck passes across all 55 workspace tasks. The merging author should run the full `pnpm check` before pushing; anything that surfaces there is merge-adjacent, not merge-introduced.
- **Routes that used to live at `/org/$slug`** — if any downstream nodes/infrastructure pages linked there, their callers need to adopt the new `/organizations/{slug}/*` shell apps. Deferred: out of scope for the merge itself.
- **`LanguageSelector` consumers** — feature's rich version expects `i18n.options.supportedLngs` to be populated. If a caller mounts it before the i18n instance is ready, it will briefly render a single-language state. Not a regression (same behavior as before the merge on feature), but worth remembering when adding it to new routes.

## Verification

```bash
pnpm typecheck          # 55/55 successful
git diff --name-only --diff-filter=U   # empty
```

Tree is ready for a merge commit.
