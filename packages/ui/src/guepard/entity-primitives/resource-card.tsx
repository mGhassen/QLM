import type { ReactNode } from 'react';

export type ResourceCardProps = Readonly<{
  label: string;
  value: string | number;
  unit: string;
  icon: ReactNode;
}>;

export function ResourceCard({ label, value, unit, icon }: ResourceCardProps) {
  return (
    <div className="group bg-muted/10 border-border hover:bg-background hover:border-primary/50 relative overflow-hidden rounded-none border p-5 shadow-sm transition-all">
      <div className="text-muted-foreground/30 group-hover:text-primary/50 absolute top-4 right-4 transition-colors">
        {icon}
      </div>
      <p className="text-muted-foreground/70 mb-3 block text-[10px] font-bold tracking-tight uppercase">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl leading-none font-bold tracking-tighter tabular-nums">
          {value}
        </span>
        <span className="text-muted-foreground text-[10px] font-bold tracking-tight uppercase opacity-50">
          {unit}
        </span>
      </div>
    </div>
  );
}
