---
story: ./story.md
status: done
layer: features
files:
  - packages/features/qwery-agent/src/credits-banner.tsx
  - apps/web/src/lib/i18n/locales/en/chat.json
---

# Add credits banner component

## Purpose

Display an "Add credits" banner with a CTA linking to the org billing page, shown when the agent is gated by zero balance.

## Files

- `packages/features/qwery-agent/src/credits-banner.tsx` — **new**. Exports `CreditsBanner({ orgSlug }: { orgSlug: string })`. Renders using `react-i18next`'s `useTranslation()` with namespace `chat`. Structure: title + description + `<a>` CTA linking to `/org/${orgSlug}/billing`. Visual: reuse `@qlm/ui/alert` for consistency.
- `apps/web/src/lib/i18n/locales/en/chat.json` — extend with `credits.banner_title`, `credits.banner_description`, `credits.cta` keys (phase-1 English only).

## Acceptance

- [ ] `CreditsBanner` exported from `@qlm/qwery-agent`.
- [ ] All three strings use `t('credits.X')` — no hardcoded English in the component.
- [ ] Clicking the CTA navigates to `/org/<orgSlug>/billing` in the same shell tab.
- [ ] `chat.json` has the three new keys nested under a `credits` object.
- [ ] `pnpm --filter @qlm/qwery-agent typecheck` passes.

## Test plan

```
pnpm --filter @qlm/qwery-agent typecheck
```

Manual smoke (after task 003): with a zero-balance org, open the panel → see the banner with translated strings; click CTA → navigate to billing page.

## Notes

- Keep the banner self-contained — no dependency on `useShell()`; `orgSlug` arrives as a prop so Storybook can render both balance states without mocking the shell provider.
- Use `<a href>` not `<Link>` — the feature package already avoids `@tanstack/react-router` internals for static nav; simple hrefs suffice since the shell intercepts same-origin nav.
- Icon: `<AlertCircle />` from `lucide-react` (already a dep) for the banner icon.
