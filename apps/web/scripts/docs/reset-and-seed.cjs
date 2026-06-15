#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const { loadDocsEnv, syncLocalSupabaseFromCli, repoRoot, webDir } = require('./load-env.cjs');

loadDocsEnv();

const email = process.env.ADMIN_EMAIL || 'admin@qlm.dev';
const password = process.env.ADMIN_PASSWORD || 'QLM2026!';
const skipReset = process.argv.includes('--skip-reset');
const remoteArg = process.argv.includes('--remote')
  ? process.argv[process.argv.indexOf('--remote') + 1] || 'prod'
  : null;

function isLocalSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  return url.includes('127.0.0.1') || url.includes('localhost');
}

const useLocal = !remoteArg && isLocalSupabase();

console.log('🚀 Starting QLM Docs CMS setup...\n');
console.log(
  `📍 Target: ${remoteArg ? `remote (${remoteArg})` : useLocal ? 'local Supabase' : 'linked remote project'}\n`,
);

try {
  if (!skipReset && useLocal) {
    console.log('📦 Step 1: Resetting local Supabase...');
    execSync('pnpm supabase:web:reset', {
      stdio: 'inherit',
      cwd: repoRoot,
      env: process.env,
    });
    console.log('✅ Database reset\n');

    console.log('🔄 Regenerating Supabase types...');
    execSync('pnpm supabase:web:typegen', {
      stdio: 'inherit',
      cwd: repoRoot,
      env: process.env,
    });
    console.log('✅ Types regenerated\n');
    syncLocalSupabaseFromCli();
  } else if (!skipReset) {
    console.log('📦 Step 1: Applying Supabase migrations...');
    execSync('pnpm exec supabase db push', {
      stdio: 'inherit',
      cwd: webDir,
      env: process.env,
    });
    console.log('✅ Migrations applied\n');
  } else {
    console.log('⏭️  Skipping database reset\n');
  }

  const adminArgs = [`--email`, email, `--password`, password];
  if (remoteArg) adminArgs.push('--remote', remoteArg);

  console.log('👤 Step 2: Creating CMS admin user...');
  execSync(`node scripts/docs/create-admin-user.cjs ${adminArgs.join(' ')}`, {
    stdio: 'inherit',
    cwd: webDir,
    env: process.env,
  });
  console.log('✅ Admin user ready\n');

  const seedArgs = remoteArg ? `--remote ${remoteArg}` : '';
  console.log('🌱 Step 3: Seeding docs CMS data...');
  execSync(`pnpm exec tsx scripts/docs/seed-data.ts ${seedArgs}`, {
    stdio: 'inherit',
    cwd: webDir,
    env: process.env,
  });
  console.log('✅ Data seeded\n');

  const port = process.env.WEB_PORT || process.env.PORT || '3000';
  const base = `http://localhost:${port}`;

  console.log('🎉 All steps completed!');
  console.log('\n🔐 CMS Login:');
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Studio:   ${base}/prj/qlm-project/studio`);
  console.log(`   Sign in:  ${base}/auth/sign-in`);
  console.log('\n📄 Docs:');
  console.log(`   Preview:  ${base}/docs/ia-agentique`);
  console.log(`   Example:  ${base}/studio/ia-agentique`);
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
