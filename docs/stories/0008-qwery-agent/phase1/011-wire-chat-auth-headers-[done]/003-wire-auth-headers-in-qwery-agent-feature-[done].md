---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/qwery-agent/src/assistant-panel-body.tsx
  - packages/features/qwery-agent/src/agent-tab-body.tsx
  - packages/features/qwery-agent/package.json
validation:
  kind: ui-smoke
  route: /prj/$projectSlug
  expect_console: empty
  expect_network_2xx:
    - /api/chat/
---

# Wire auth headers into qwery-agent panel and tab bodies

Use the new `transportFactory(slug, model, { getHeaders })` signature so `POST /api/chat/:slug` carries the Supabase bearer token — today it arrives unauthenticated and the server returns 404 because RLS hides the conversation row.

## Done when

- [ ] `assistant-panel-body.tsx`: `transport` memo becomes `(model) => transportFactory(conversation.slug, model, { getHeaders: getAuthHeaders })`.
- [ ] `agent-tab-body.tsx`: same change.
- [ ] Import `getAuthHeaders` from `@qlm/supabase/auth-headers`.
- [ ] Add `"@qlm/supabase": "workspace:*"` to `packages/features/qwery-agent/package.json` if it's not already a dependency.
- [ ] Signing in, opening a project, and opening the assistant panel results in `POST /api/chat/<slug>` returning 2xx (not 404). Verified via `ui-validator` under the `expect_network_2xx` check.

## Notes

- No storybook changes needed — the transport is constructed at runtime, not a prop visible in the story harness.
- Keep the memo dep-array as `[conversation]` (or `[conversation?.slug]`). `getAuthHeaders` is a stable module-level function, no need to add it.
