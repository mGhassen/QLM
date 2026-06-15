import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, '..');
const envPath = join(serverRoot, '.env');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed
          .slice(eq + 1)
          .trim()
          .replace(/^["']|["']$/g, '');
        if (process.env[key] === undefined) process.env[key] = value;
      }
    }
  }
}

function syncLocalSupabaseFromCli() {
  const webDir = join(serverRoot, '../web');
  try {
    const json = execSync('supabase status --output json', {
      cwd: webDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const status = JSON.parse(json) as {
      API_URL?: string;
      PUBLISHABLE_KEY?: string;
      ANON_KEY?: string;
      SECRET_KEY?: string;
      SERVICE_ROLE_KEY?: string;
    };
    const url = status.API_URL;
    if (
      !url ||
      (!url.includes('127.0.0.1') && !url.includes('localhost'))
    ) {
      return;
    }

    process.env.SUPABASE_URL = url;

    const anonKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
    if (anonKey) {
      process.env.SUPABASE_ANON_KEY = anonKey;
    }

    const serviceKey = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
    if (serviceKey) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
    }
  } catch {
    // Local Supabase not running — keep .env values.
  }
}

syncLocalSupabaseFromCli();

const { createApp } = await import('./server');

const storageDir = process.env.QWERY_STORAGE_DIR ?? 'qwery.db';
process.env.QWERY_STORAGE_DIR = isAbsolute(storageDir)
  ? storageDir
  : resolve(serverRoot, storageDir);

const raw =
  process.env.WORKSPACE?.trim() ||
  process.env.VITE_WORKING_DIR?.trim() ||
  process.env.WORKING_DIR?.trim() ||
  'workspace';
process.env.WORKSPACE = isAbsolute(raw) ? raw : resolve(serverRoot, raw);

const PORT = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 4096);
const HOSTNAME = process.env.HOSTNAME ?? '0.0.0.0';

const app = createApp();

const server = Bun.serve({
  port: PORT,
  hostname: HOSTNAME,
  fetch: app.fetch,
  idleTimeout: 120,
});

console.log(`[Server] Listening on http://${server.hostname}:${server.port}`);
