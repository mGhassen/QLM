import type {
  NodeHealth,
  NodeLifecycleState,
  NodeProvider,
} from '@qlm/domain/entities';

/**
 * Centralized status palette for the topology feature. Mirrors the
 * pattern used by `packages/features/ops/infrastructure` so cards,
 * sheets, host map, and the fleet summary aside all consume the same
 * tokens.
 */

/**
 * Health-axis palette (RFC 0026 §5.5). Topology pool card distribution
 * bar reads `pool.healthCounts` and tones each segment via this map.
 */
export const HEALTH_DOT: Record<NodeHealth, string> = {
  healthy: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  critical: 'bg-destructive',
  unknown: 'bg-muted-foreground/40',
};

export const HEALTH_TILE: Record<NodeHealth, { bg: string; hover: string }> = {
  healthy: { bg: 'bg-emerald-500/90', hover: 'hover:bg-emerald-400' },
  degraded: { bg: 'bg-amber-500/90', hover: 'hover:bg-amber-400' },
  critical: { bg: 'bg-destructive/90', hover: 'hover:bg-destructive' },
  unknown: {
    bg: 'bg-muted-foreground/30',
    hover: 'hover:bg-muted-foreground/50',
  },
};

/**
 * Lifecycle-axis palette (RFC 0026 §5). Pool card lifecycle dot row
 * uses these — six small dots indicating operator-intent distribution.
 */
export const LIFECYCLE_DOT: Record<NodeLifecycleState, string> = {
  provisioning: 'bg-blue-500',
  active: 'bg-emerald-500',
  stopping: 'bg-amber-500',
  stopped: 'bg-muted-foreground/40',
  terminating: 'bg-destructive/70',
  terminated: 'bg-muted-foreground/20',
};

export const HEALTH_KEYS: readonly NodeHealth[] = [
  'healthy',
  'degraded',
  'critical',
  'unknown',
];

export const LIFECYCLE_KEYS: readonly NodeLifecycleState[] = [
  'provisioning',
  'active',
  'stopping',
  'stopped',
  'terminating',
  'terminated',
];

/** Provider brand tokens. Used by pool cards, sheets, host map. */
export const PROVIDER_TONE: Record<NodeProvider | 'unknown', { bg: string; text: string }> = {
  aws: { bg: 'bg-[#FF9900]/15', text: 'text-[#FF9900]' },
  gcp: { bg: 'bg-[#34A853]/15', text: 'text-[#34A853]' },
  azure: { bg: 'bg-[#0078D4]/15', text: 'text-[#0078D4]' },
  'on-premise': { bg: 'bg-muted/60', text: 'text-muted-foreground' },
  unknown: { bg: 'bg-muted/60', text: 'text-muted-foreground' },
};
