import type { NodeProvider } from '@qlm/domain/entities';

/**
 * Visual classes for the eight composite states from `getNodeDisplayState`.
 * Mapped per `NodeDisplayKind` — the UI source of truth post-RFC 0026.
 */
export const DISPLAY_BADGE_CLASSES = {
  running:
    'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  degraded:
    'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
  draining:
    'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
  ineligible: 'bg-muted text-muted-foreground border-border',
  inactive: 'bg-muted text-muted-foreground border-border',
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
  unreachable: 'bg-destructive/15 text-destructive border-destructive/30',
  pending:
    'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400',
} as const;

export const PROVIDER_STYLES: Record<
  NodeProvider,
  { bg: string; text: string }
> = {
  aws: { bg: 'bg-[#FF9900]/15', text: 'text-[#FF9900]' },
  gcp: { bg: 'bg-[#34A853]/15', text: 'text-[#34A853]' },
  azure: { bg: 'bg-[#0078D4]/15', text: 'text-[#0078D4]' },
  'on-premise': {
    bg: 'bg-muted/60',
    text: 'text-muted-foreground',
  },
};

export const GRID_COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

/** Row height presets for the compact/normal/comfortable density toggle (Phase 7). */
export const DENSITY_HEIGHTS = {
  compact: 28,
  normal: 40,
  comfortable: 56,
} as const;

export type Density = keyof typeof DENSITY_HEIGHTS;
