---
spec: docs/specs/0025-user-profile-phase1.md
spec_sections:
  - "#321-profile-section-prjsluguser-settings-sidebar--profile"
  - "#33-user-flows-happy-paths"
  - "#34-error-and-edge-case-behaviour"
  - "#72-adapters-packagesrepositoriessupabase-and-appswebsrclibrepositories"
  - "#73-shell-runtime-packagesshell-runtime"
  - "#75-presentation--feature-package-packagesfeaturesuser-profile"
  - "#8-permissions-and-rls"
  - "#9-security-checklist"
  - "#12-implementation-sequencing"
status: done
started: 2026-04-27
finished: 2026-04-27
blocks: []
blocked_by: [001]
---

# Add profile avatar card

## Goal

A signed-in user can upload a profile picture or clear it back to initials; the change reflects in the Profile card and the topbar avatar immediately.

## Scope

**In scope**

- Domain: `UploadAvatarService`, `ClearAvatarService`, `UploadAvatarInputSchema` (File + userId).
- Adapter: add `uploadAvatar` + `clearAvatar` to `PersonalAccountRepository`, implementing the cache-busted `{userId}.{ext}?v={nanoid}` path and old-file replacement pattern (spec §4.1 SD-2; referenced against legacy `update-account-image-container.tsx`).
- Shell runtime: `shell.personalAccount.uploadAvatar(file)` + `shell.personalAccount.clearAvatar()`, both invalidating `['personal-account', userId]`.
- Presentation: `PictureCard` (starts read-only avatar preview using `ProfileAvatar`, then adds `ImageUploader` + Clear affordance); Storybook stories + component tests.
- Client-side MIME + size validation (reject non-image, >2 MB) before any upload call.

**Out of scope** (forces honest slicing)

- Storage bucket or RLS changes — `account_image` is already in `19-storage.sql` (spec §6.1, §8).
- Polyglot / SVG-XSS hardening — deferred (spec §13).
- Password or MFA cards.

## Acceptance criteria

- [x] `Your Profile Picture` card renders the current avatar or initials fallback via `ProfileAvatar` when `picture_url` is null.
- [x] Selecting a valid image uploads it, writes `accounts.picture_url`, and shows the new image in both the card and the topbar without reload.
- [x] Clicking *Clear* removes the storage file and sets `picture_url` to null; initials return in both places.
- [x] Selecting a non-image file or an image larger than 2 MB is rejected client-side with an inline error — no Storage call is made.
- [x] Re-uploading replaces the previous file in the bucket (no orphaned files — verify via Supabase Storage UI). *Logic-verified via `extractStoragePath` + `bucket.remove` before upload; not browser-tested in this run.*
- [x] All writes go through `IAccountRepository`; no React component calls `client.storage.from(...)` directly.
- [x] `pnpm typecheck` (54/54), `pnpm lint` (clean), `pnpm --filter @qlm/domain test` (302/3 skipped), `pnpm --filter @qlm/repository-supabase test` (23/23), `pnpm --filter @qlm/user-profile test` (9/9) all pass.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-add-readonly-picture-card](001-add-readonly-picture-card-[done].md) — features · ui-smoke · ✅
2. [002-wire-avatar-upload-spine](002-wire-avatar-upload-spine-[done].md) — adapter · domain-test · ✅
3. [003-make-picture-card-interactive](003-make-picture-card-interactive-[done].md) — features · ui-smoke · ✅

## Demo / verification

1. `pnpm supabase:web:start && pnpm dev`, sign in.
2. Navigate to **Settings → Profile**. Confirm initials fallback (assumes no avatar set).
3. Upload a small PNG. Confirm image appears in card and topbar within one animation frame.
4. Upload a different PNG. Confirm previous object is gone from the `account_image` bucket (Supabase Studio).
5. Click *Clear*. Confirm initials return and `picture_url` is null (SQL: `select picture_url from accounts where user_id = auth.uid()`).
6. Try to upload a 3 MB image and a `.txt` file. Confirm each is rejected inline with no network call.

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- <bullet, only when something unexpected came up during implementation>

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [x] The referenced spec sections still match the implementation as shipped — **no**: `IAccountRepository.uploadAvatar` takes primitive `{bytes, extension}` instead of spec §5.1's `File` shape (domain hex rule keeps `packages/domain` free of DOM types). See spec §Changelog 2026-04-27.
