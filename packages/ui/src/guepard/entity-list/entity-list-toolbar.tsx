import { type ReactNode, useRef } from 'react';
import { Plus, Search, Loader2, type LucideIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../../shadcn/button';
import { Input } from '../../shadcn/input';

export type EntityListPrimaryAction = {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  'data-test'?: string;
};

export type EntityListToolbarProps = {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  options?: ReactNode;
  primaryAction?: EntityListPrimaryAction;
  /**
   * Render a fully custom CTA (e.g. a DialogTrigger wrapping a Button).
   * Takes precedence over `primaryAction` when both are provided.
   */
  primarySlot?: ReactNode;
  className?: string;
};

export function EntityListToolbar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  options,
  primaryAction,
  primarySlot,
  className,
}: Readonly<EntityListToolbarProps>) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('flex w-full items-center gap-3', className)}>
      {/* Search + options group */}
      <div className="group bg-background border-border focus-within:border-primary flex min-w-0 flex-1 items-center rounded-none border shadow-sm transition-all">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3.5">
          <Search className="text-muted-foreground/50 group-focus-within:text-primary h-3.5 w-3.5 shrink-0 transition-colors" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                inputRef.current?.blur();
              }
            }}
            className="placeholder:text-muted-foreground/40 h-10 min-w-0 flex-1 border-0 bg-transparent px-0 text-[13px] font-bold tracking-tight shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        {options && (
          <>
            <div className="border-border h-4 w-px border-l" aria-hidden />
            <div className="flex shrink-0 items-center pr-1">{options}</div>
          </>
        )}
      </div>

      {/* Primary action */}
      {primarySlot ? (
        <div className="flex shrink-0 items-center">{primarySlot}</div>
      ) : primaryAction ? (
        <Button
          type="button"
          data-test={primaryAction['data-test']}
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled || primaryAction.loading}
          className="industrial-button"
        >
          {primaryAction.loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : primaryAction.icon ? (
            <primaryAction.icon className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {primaryAction.label}
        </Button>
      ) : null}
    </div>
  );
}
