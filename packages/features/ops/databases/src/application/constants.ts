import type { DatabaseStatus } from '@guepard/domain/entities';

export const PROVIDER_LABELS: Record<string, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  redis: 'Redis',
  mongodb: 'MongoDB',
};

export const PROVIDER_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  postgres: {
    bg: 'bg-[#336791]/15',
    text: 'text-[#336791] dark:text-[#6FA8D6]',
    border: 'border-[#336791]/35',
  },
  mysql: {
    bg: 'bg-[#E48E00]/15',
    text: 'text-[#E48E00] dark:text-[#FFB45C]',
    border: 'border-[#E48E00]/35',
  },
  redis: {
    bg: 'bg-[#DC382D]/15',
    text: 'text-[#DC382D] dark:text-[#FF6B63]',
    border: 'border-[#DC382D]/35',
  },
  mongodb: {
    bg: 'bg-[#47A248]/15',
    text: 'text-[#47A248] dark:text-[#7CCB7D]',
    border: 'border-[#47A248]/35',
  },
};

export const GRID_COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
};

export const STATUS_BADGE: Record<DatabaseStatus, string> = {
  init: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400',
  in_progress:
    'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
  created:
    'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  error: 'bg-destructive/15 text-destructive border-destructive/30',
  deleted: 'bg-muted/50 text-muted-foreground/60 border-border/50',
};
