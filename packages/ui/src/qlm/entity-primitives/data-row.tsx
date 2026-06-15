import type { ReactNode } from 'react';

import { cn } from '@qlm/ui/utils';

export type DataRowProps = Readonly<{
  icon: ReactNode;
  label: string;
  value?: string | number | null;
  /** Render a ReactNode in the value slot instead of the text value. */
  valueNode?: ReactNode;
  mono?: boolean;
}>;

export function DataRow({
  icon,
  label,
  value,
  valueNode,
  mono = false,
}: DataRowProps) {
  return (
    <div className="group flex items-center justify-between py-2">
      <div className="text-muted-foreground flex items-center gap-4">
        <div className="bg-muted/30 border-border group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30 rounded-none border p-2 transition-all">
          {icon}
        </div>
        <span className="group-hover:text-foreground/80 text-[11px] font-bold tracking-tight uppercase transition-colors">
          {label}
        </span>
      </div>
      {valueNode ?? (
        <span
          className={cn(
            'text-foreground text-[13px] font-bold tracking-tight',
            mono && 'text-foreground/70 font-mono text-[11px] uppercase',
          )}
        >
          {value ?? '—'}
        </span>
      )}
    </div>
  );
}
