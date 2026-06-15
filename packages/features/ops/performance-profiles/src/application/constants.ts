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

export const STATUS_BADGE = {
  active: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  inactive: 'bg-muted/50 text-muted-foreground/60 border-border/50',
} as const;
