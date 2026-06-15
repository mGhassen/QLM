import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type EntitySectionProps = Readonly<{
  title: string;
  children: ReactNode;
  className?: string;
}>;

export function EntitySection({
  title,
  children,
  className,
}: EntitySectionProps) {
  return (
    <section className={cn('px-0', className)}>
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary h-6 w-1.5" />
        <h3 className="text-foreground/90 text-[11px] leading-none font-extrabold tracking-[0.3em] uppercase">
          {title}
        </h3>
        <div className="from-border/80 via-border/20 h-px flex-1 bg-gradient-to-r to-transparent" />
      </div>
      <div className="relative pl-4">{children}</div>
    </section>
  );
}
