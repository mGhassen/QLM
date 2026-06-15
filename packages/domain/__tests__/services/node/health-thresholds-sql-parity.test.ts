import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { HEALTH_THRESHOLDS } from '../../../src/services/node/health-thresholds';

/**
 * TS↔SQL parity guard for health thresholds. Spec §5.5: SQL `pool_view`
 * derives node health using identical 70/90 literals as the TypeScript
 * `deriveNodeHealth` helper. If either side drifts, aggregate health
 * counts diverge from per-node health silently — this test catches it
 * at CI time.
 *
 * Asserted against the schema file (declarative source of truth) rather
 * than the migration so a re-`pnpm supabase:web:reset` rebuilds with
 * matching values. After story 0026-005 the active pool_view definition
 * lives in schema 49 (cleanup) — schemas 46 + 48 are superseded but
 * preserved as migration-arc record.
 */

const SCHEMA_PATH = resolve(
  __dirname,
  '../../../../../apps/web/supabase/schemas/50-node-state-cleanup.sql',
);

describe('HEALTH_THRESHOLDS TS↔SQL parity', () => {
  const sql = readFileSync(SCHEMA_PATH, 'utf8');

  it('TS constants match the documented values', () => {
    expect(HEALTH_THRESHOLDS).toEqual({
      CPU_HIGH: 70,
      CPU_CRITICAL: 90,
      MEM_HIGH: 70,
      MEM_CRITICAL: 90,
    });
  });

  it('SQL pool_view uses the same 70/90 literals', () => {
    // Critical thresholds (>= 90).
    expect(sql).toMatch(/rs\.cpu_util_pct\s*>=\s*90/);
    expect(sql).toMatch(/rs\.mem_util_pct\s*>=\s*90/);
    // Degraded thresholds (>= 70).
    expect(sql).toMatch(/rs\.cpu_util_pct\s*>=\s*70/);
    expect(sql).toMatch(/rs\.mem_util_pct\s*>=\s*70/);
  });

  it('SQL critical literal === TS CPU_CRITICAL', () => {
    const match = sql.match(/cpu_util_pct\s*>=\s*(\d+)\)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(HEALTH_THRESHOLDS.CPU_CRITICAL);
  });

  it('SQL degraded literal === TS CPU_HIGH', () => {
    // Second `cpu_util_pct >= NN` occurrence (after the critical match).
    const all = [...sql.matchAll(/cpu_util_pct\s*>=\s*(\d+)\)/g)];
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(Number(all[1]![1])).toBe(HEALTH_THRESHOLDS.CPU_HIGH);
  });

  it('SQL memory thresholds match TS', () => {
    const all = [...sql.matchAll(/mem_util_pct\s*>=\s*(\d+)\)/g)];
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(Number(all[0]![1])).toBe(HEALTH_THRESHOLDS.MEM_CRITICAL);
    expect(Number(all[1]![1])).toBe(HEALTH_THRESHOLDS.MEM_HIGH);
  });
});
