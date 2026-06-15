const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const webDir = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(webDir, '../..');

function ensureLocalSupabaseRunning() {
  try {
    execSync('supabase status --output json', {
      cwd: webDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    console.log('⏳ Local Supabase not running — starting...');
    try {
      execSync('supabase start', { cwd: webDir, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  }
}

function syncLocalSupabaseFromCli() {
  try {
    const json = execSync('supabase status --output json', {
      cwd: webDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const status = JSON.parse(json);
    const url = status.API_URL;
    if (!url || (!url.includes('127.0.0.1') && !url.includes('localhost'))) {
      return false;
    }

    process.env.VITE_SUPABASE_URL = url;
    process.env.SUPABASE_URL = url;

    const anonKey = status.ANON_KEY || status.PUBLISHABLE_KEY;
    if (anonKey) {
      process.env.VITE_SUPABASE_ANON_KEY = anonKey;
      process.env.VITE_SUPABASE_PUBLIC_KEY = anonKey;
    }

    const serviceKey = status.SERVICE_ROLE_KEY || status.SECRET_KEY;
    if (serviceKey) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
    }

    return true;
  } catch {
    return false;
  }
}

function loadDocsEnv() {
  for (const envPath of [
    path.join(webDir, '.env'),
    path.join(repoRoot, '.env'),
  ]) {
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }
  }

  ensureLocalSupabaseRunning();
  if (!syncLocalSupabaseFromCli()) {
    console.warn(
      '⚠️  Could not sync Supabase URL from CLI — check apps/web/.env or run supabase start',
    );
  }
}

module.exports = {
  loadDocsEnv,
  syncLocalSupabaseFromCli,
  webDir,
  repoRoot,
};
