---
story: ./story.md
status: skipped
layer: tests
files:
  - packages/shell-runtime/src/resources/conversations.test.ts
---

# Add conversations resource tests

## Purpose

Cover the two behavioural guarantees the resource adds on top of the underlying domain services: `getBySlug` happy + not-found paths and `getDefaultForProject` idempotency.

## Files

- `packages/shell-runtime/src/resources/conversations.test.ts` — **new**. Vitest unit tests with a hand-rolled mock `IConversationRepository` (plain object satisfying the abstract port). Use a fresh `QueryClient` per test.

## Acceptance

- [ ] `getBySlug('found-slug')` returns the mocked conversation.
- [ ] `getBySlug('missing')` rejects (matches `GetConversationBySlugService` not-found semantics).
- [ ] `getDefaultForProject()` called twice in sequence returns the same conversation slug both times.
- [ ] `mockRepo.create` is invoked **exactly once** across both `getDefaultForProject()` calls (proves idempotency: second call uses the conversation just created).
- [ ] `pnpm --filter @qlm/shell-runtime test` passes; new file appears in coverage output.

## Test plan

```
pnpm --filter @qlm/shell-runtime test conversations.test.ts
```

## Notes

- For the second `getDefaultForProject()` call, the mock's `findByProjectId` should return the conversation created on the first call. Easiest: keep an in-memory array on the mock and push on `create`.
- Don't import `@tanstack/react-query` provider — the resource creator takes a `QueryClient` instance directly.
- Skip mocking domain services — call the real classes; only the repository is mocked.

## Skipped because

`@qlm/shell-runtime` has no Vitest infrastructure today (no `test` script, no `vitest.config`, no devDep). Adding it solely for these tests is real scope creep, and **story 010 (`add-qwery-agent-tests`)** explicitly covers "Vitest unit tests for the feature package + `conversations` resource" with the broader test setup. Folding this task into 010 avoids duplicate effort and keeps story 003 strictly scoped to the resource implementation.
