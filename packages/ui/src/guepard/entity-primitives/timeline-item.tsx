import { cn } from '@guepard/ui/utils';

export type TimelineItemProps = Readonly<{
  label: string;
  primary: string;
  secondary?: string;
  dotColor: string;
}>;

export function TimelineItem({
  label,
  primary,
  secondary,
  dotColor,
}: TimelineItemProps) {
  return (
    <div className="group flex items-start gap-6">
      <div className="relative flex flex-col items-center self-stretch pt-2">
        <div
          className={cn(
            'ring-background border-border z-10 h-3.5 w-3.5 rounded-none border ring-4',
            dotColor,
          )}
        />
        <div className="bg-border absolute top-2 h-full w-[2px] group-last:hidden" />
      </div>
      <div className="flex-1">
        <p className="text-muted-foreground mb-1 block text-[10px] font-black tracking-[0.25em] uppercase opacity-80">
          {label}
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-foreground text-sm font-black tracking-tight uppercase">
            {primary}
          </span>
          {secondary ? (
            <span className="text-muted-foreground text-[11px] font-black tracking-widest tabular-nums opacity-60">
              {secondary}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
