/**
 * Single source of truth for health-derivation thresholds.
 *
 * Both `deriveNodeHealth` (TS, single-node read) and `pool_view`
 * (SQL, aggregate counts) must use identical numeric values. CI
 * parity test parses the schema files and asserts these constants
 * match the SQL literals.
 *
 * RFC 0026 §5.5. Phase 2 hardcodes; per-organization configurability
 * is RFC 0030+.
 */
export const HEALTH_THRESHOLDS = {
  CPU_HIGH: 70,
  CPU_CRITICAL: 90,
  MEM_HIGH: 70,
  MEM_CRITICAL: 90,
} as const;

export type HealthThresholds = typeof HEALTH_THRESHOLDS;
