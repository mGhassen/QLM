import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type BadgeItemProps = Readonly<{
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}>;

export function BadgeItem({ icon, label, onClick, className }: BadgeItemProps) {
  const isButton = !!onClick;
  const Comp = isButton ? 'button' : 'div';

  return (
    <Comp
      type={isButton ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'bg-muted/30 border-border hover:bg-background hover:border-foreground flex cursor-pointer items-center gap-2 rounded-none border px-2.5 py-1.5 transition-all',
        className,
      )}
    >
      <div className="text-muted-foreground group-hover:text-foreground">
        {icon}
      </div>
      <span className="text-foreground text-[10px] font-bold tracking-tight uppercase">
        {label}
      </span>
    </Comp>
  );
}
