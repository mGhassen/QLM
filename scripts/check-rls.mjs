#!/usr/bin/env node
// Verifies every `public.<table>` created under apps/web/supabase/schemas/
// has a matching `enable row level security` somewhere in the schemas tree.
// Scope is cross-file: a CREATE TABLE in 40-foo.sql may be flipped to RLS in
// 42-platform-rls.sql — that's intentional.
//
// Run as `node scripts/check-rls.mjs` (wired into `pnpm check`).

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SCHEMAS_DIR = 'apps/web/supabase/schemas';

// `create table [if not exists] [public.|"public".]<name>(`
const CREATE_TABLE_RE =
  /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?public"?\.)?"?([a-z_][a-z0-9_]*)"?\s*\(/gi;

// `alter table [public.|"public".]<name> enable row level security`
const ENABLE_RLS_RE =
  /alter\s+table\s+(?:only\s+)?(?:"?public"?\.)?"?([a-z_][a-z0-9_]*)"?\s+enable\s+row\s+level\s+security/gi;

const files = readdirSync(SCHEMAS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => join(SCHEMAS_DIR, f));

const created = new Map();
const enabled = new Set();

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const match of src.matchAll(CREATE_TABLE_RE)) {
    const name = match[1];
    if (!created.has(name)) created.set(name, file);
  }
  for (const match of src.matchAll(ENABLE_RLS_RE)) {
    enabled.add(match[1]);
  }
}

const missing = [...created.entries()]
  .filter(([name]) => !enabled.has(name))
  .sort(([a], [b]) => a.localeCompare(b));

if (missing.length === 0) {
  console.log(`[check-rls] ✓ all ${created.size} tables have RLS enabled.`);
  process.exit(0);
}

console.error(`[check-rls] ✖ ${missing.length} table(s) missing RLS:`);
for (const [name, file] of missing) {
  console.error(`  - public.${name}  (created in ${file})`);
}
console.error('');
console.error('Every table in apps/web/supabase/schemas/ must call');
console.error('  alter table "public"."<name>" enable row level security;');
console.error('somewhere in the schemas tree. See .claude/rules/database.md.');
process.exit(1);
