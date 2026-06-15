import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import type { Hono } from 'hono';

import type { CreateAppOptions } from '../../src/server.js';
import { createMockRepositories } from './mock-repositories';

export async function createTestApp(
  overrides?: Omit<CreateAppOptions, 'getRepositories'>,
): Promise<{ app: Hono; testDir: string }> {
  const testDir = path.join(
    os.tmpdir(),
    `qwery-server-api-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  await fs.mkdir(testDir, { recursive: true });
  process.env.QWERY_STORAGE_DIR = testDir;
  process.env.SUPABASE_URL =
    process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
  process.env.SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  // Server-side secret vault needs a key to boot. AesGcmSecretVault stretches
  // this phrase with scrypt into a valid 32-byte key.
  process.env.GUEPARD_SECRET_VAULT_KEY =
    process.env.GUEPARD_SECRET_VAULT_KEY ?? 'guepard-test-vault-key-phase-1';
  process.env.JWT_SECRET =
    process.env.JWT_SECRET ??
    'guepard-test-jwt-secret-with-enough-bits-to-sign-HS256';
  const mockRepos = createMockRepositories();
  const mod = await import('../../src/server.js');
  const app = mod.createApp({
    getRepositories: async () => mockRepos,
    ...overrides,
  });
  return { app, testDir };
}

export async function cleanupTestDir(testDir: string): Promise<void> {
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
}
