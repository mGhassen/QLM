#!/usr/bin/env node

const { execSync } = require('child_process');

const { loadDocsEnv, repoRoot } = require('./load-env.cjs');

loadDocsEnv();

console.log('📦 Resetting local Supabase...\n');

try {
  execSync('pnpm supabase:web:reset', {
    stdio: 'inherit',
    cwd: repoRoot,
    env: process.env,
  });
  console.log('\n🔄 Regenerating Supabase types...');
  execSync('pnpm supabase:web:typegen', {
    stdio: 'inherit',
    cwd: repoRoot,
    env: process.env,
  });
  console.log('\n✅ Local Supabase reset complete');
} catch (error) {
  console.error('❌ Reset failed:', error.message);
  process.exit(1);
}
