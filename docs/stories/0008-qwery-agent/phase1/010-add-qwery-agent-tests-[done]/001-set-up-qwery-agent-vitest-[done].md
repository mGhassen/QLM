---
story: ./story.md
status: done
layer: tests
files:
  - packages/features/qwery-agent/vitest.config.ts
  - packages/features/qwery-agent/__tests__/setup.ts
  - packages/features/qwery-agent/package.json
---

# Set up qwery-agent Vitest

## Purpose

Add Vitest infrastructure to `@guepard/qwery-agent` so the feature package can be tested. Mirrors `packages/features/accounts` setup.

## Files

- `packages/features/qwery-agent/vitest.config.ts` — copy from accounts: jsdom env, `__tests__/**/*.test.{ts,tsx}`, setupFiles, istanbul coverage.
- `packages/features/qwery-agent/__tests__/setup.ts` — copy: `@testing-library/jest-dom`, `react-i18next` mock (returns `t(key) => key`).
- `packages/features/qwery-agent/package.json` — add `"test": "vitest run --logHeapUsage --coverage --silent"` script + devDeps: `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitest/coverage-istanbul`.

## Acceptance

- [ ] `pnpm install` runs clean.
- [ ] `pnpm --filter @guepard/qwery-agent test` executes (zero tests is fine until task 002 adds some).
- [ ] `pnpm --filter @guepard/qwery-agent typecheck` still passes.

## Test plan

```
pnpm install
pnpm --filter @guepard/qwery-agent test
```

## Notes

- Copy accounts' config shape verbatim to avoid drift — same istanbul reporter, same include/exclude globs.
- `react-i18next` mock returns `t: (key) => key` so component tests assert on i18n keys, not translated strings.
