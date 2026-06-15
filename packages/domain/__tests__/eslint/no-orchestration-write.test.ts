import { RuleTester } from 'eslint';

// @ts-expect-error — local rule, no .d.ts
import rule from '../../../../tooling/eslint/rules/no-orchestration-write.js';

/**
 * Exercises the `no-orchestration-write` rule end-to-end via ESLint's
 * RuleTester. Replaces the previous manual fixture file. Each "invalid"
 * case asserts the rule reports `messageId: 'forbidden'`; each "valid"
 * case asserts no diagnostic.
 *
 * `filename` drives the allowlist regex in the rule, so we can verify
 * adapters/server are skipped while the rest of the tree errors.
 */

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

tester.run('no-orchestration-write', rule, {
  valid: [
    {
      code: 'node.lifecycle = "active";',
      filename: '/repo/packages/features/ops/infrastructure/src/foo.ts',
    },
    {
      code: 'node.eligibility = "ineligible";',
      filename: '/repo/apps/web/src/lib/foo.ts',
    },
    {
      code: 'node.orchestration = "ready";',
      filename: '/repo/packages/repositories/supabase/src/node.repository.ts',
    },
    {
      code: 'node.orchestration = "down";',
      filename: '/repo/apps/server/src/lib/orchestrator-sync.ts',
    },
  ],
  invalid: [
    {
      code: 'node.orchestration = "ready";',
      filename: '/repo/packages/features/ops/infrastructure/src/foo.ts',
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: 'someObject.orchestration = "down";',
      filename: '/repo/apps/web/src/lib/foo.ts',
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: 'this.orchestration = "disconnected";',
      filename: '/repo/packages/shell-runtime/src/foo.ts',
      errors: [{ messageId: 'forbidden' }],
    },
  ],
});

// RuleTester wires itself into `it`/`describe` from the global test runner;
// vitest exposes both via `globals: true` in vitest.config.ts.
