---
spec: docs/specs/0025-user-profile-phase1.md
spec_sections:
  - "#321-profile-section-prjsluguser-settings-sidebar--profile"
  - "#34-error-and-edge-case-behaviour"
  - "#75-presentation--feature-package-packagesfeaturesuser-profile"
status: done
started: 2026-04-28
finished: 2026-04-28
blocks: []
blocked_by: [001, 002]
---

# Fix avatar visuals

A visual-bugfix story added after story 002 shipped — not in the original spec §12 sequencing. Two issues surfaced when the page was rendered in dev:

1. **Duplicate avatar circle** in `PictureCard`. The card renders `<ProfileAvatar>` as `<ImageUploader>` children, but `ImageUploader` also draws its own avatar slot in a sibling column — producing one empty grey disc next to one initials disc.
2. **Inverted text hierarchy** on every card title. `CardTitle` from shadcn has no explicit text size and inherits the body default (~16px) with `leading-none`, while `CardDescription` is locked at `text-sm` (~14px). The multi-line description visually outweighs the compressed title.

## Goal

A signed-in user opens **Settings → Profile** and sees a single, properly-sized avatar in the Picture card, with the card title visibly more prominent than its description. Same hierarchy on the Name card.

## Scope

**In scope**

- Replace the `ImageUploader` usage in `PictureCard` with a self-contained layout: one `ProfileAvatar` (initials fallback when `pictureUrl` null), a hidden `<input type=file>` triggered by an i18n'd *Upload* button, and a *Clear* button gated on `pictureUrl !== null`. Keep client-side MIME + size gates and the existing `onUpload` / `onClear` props unchanged.
- Add explicit `text-base` to `<CardTitle>` in `PictureCard` and `NameCard` so titles render visibly larger than descriptions.
- Update `picture-card.stories.tsx` and `picture-card.test.tsx` to match the new DOM (no Storybook regression; component tests still cover upload, MIME rejection, size rejection, clear, hidden-when-no-avatar).
- Add i18n key `userProfile.picture.upload` for the Upload button label (Upload was previously hardcoded inside the `ImageUploader` primitive).

**Out of scope** (forces honest slicing)

- Changes to `packages/ui/src/shadcn/image-uploader.tsx` itself — other parts of the repo may rely on it; project-wide redesign is a separate concern.
- Any change to the password card or MFA card. Those are stories 003 and 004.
- Topbar avatar styling — already correct, propagated via the shared query key from story 001.

## Acceptance criteria

- [x] `/prj/{slug}/user-settings` Profile page shows **exactly one** avatar circle in the Picture card. *Test `renders exactly one avatar element` asserts this.*
- [x] When `pictureUrl` is null, the circle renders the user's initials via `ProfileAvatar`.
- [x] When `pictureUrl` is set, the circle renders the image and a *Clear* button appears next to *Upload*.
- [x] Card titles ("Your Profile Picture", "Your Name") visibly larger and bolder than their descriptions on the same card. *`<CardTitle className="text-base">` applied to both.*
- [x] All button labels in `PictureCard` route through `t('userProfile.picture.*')` — no hardcoded English.
- [x] Selecting a non-image file or an image >2 MB still rejects client-side with an inline alert (regression-tested). *Two existing tests carry forward; alert role asserted.*
- [x] `pnpm typecheck` (54/54), `pnpm lint` (clean), `pnpm --filter @qlm/user-profile test` (11/11), `pnpm --filter @qlm/domain test` (302/3 skipped) all pass.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-rewrite-picture-card-layout](001-rewrite-picture-card-layout-[done].md) — features · ui-smoke · ✅

## Demo / verification

1. `pnpm supabase:web:start && pnpm dev` (or `pnpm preview` from the worktree).
2. Navigate to **Settings → Profile**.
3. Confirm a single circle with initials, *Upload* button below it.
4. Title "Your Profile Picture" visibly larger/bolder than the description; same on the Name card.
5. Upload a small PNG. Confirm the circle now shows the image and *Clear* appears.
6. Click *Clear*. Confirm initials return; *Clear* button disappears.
7. Try uploading a `.txt` file or a >2 MB image — inline error appears, no network call.

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- <bullet, only when something unexpected came up during implementation>

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [x] The referenced spec sections still match the implementation as shipped — yes, refactor aligns with §3.2.1 mockup.
