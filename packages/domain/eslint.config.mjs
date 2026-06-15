import baseConfig from '@qlm/eslint-config/base.js';

// Domain is pure: no React, no HTTP clients, no Supabase, no runtime/adapters.
// See .claude/rules/hexagonal-architecture.md.
const BANNED_PATTERNS = [
  'react',
  'react-dom',
  'react-router',
  'react-router-dom',
  '@tanstack/*',
  '@supabase/*',
  'next',
  'next/*',
  'hono',
  'hono/*',
  '@qlm/repository-supabase',
  '@qlm/repository-*',
  '@qlm/shell-runtime',
  '@qlm/shell-runtime/*',
  '@qlm/supabase',
  '@qlm/supabase/*',
  '@qlm/ui',
  '@qlm/ui/*',
];

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: BANNED_PATTERNS.map((p) => ({
            group: [p],
            message:
              'packages/domain must stay pure. See .claude/rules/hexagonal-architecture.md — use repository ports, not adapters or framework code.',
          })),
        },
      ],
    },
  },
];
