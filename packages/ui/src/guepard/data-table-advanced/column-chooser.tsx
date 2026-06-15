import { Columns3 } from 'lucide-react';

import { Button } from '../../shadcn/button';
import { Checkbox } from '../../shadcn/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import { cn } from '../../lib/utils';
import type { AdvancedColumn } from './types';

export type ColumnChooserProps<T> = {
  columns: AdvancedColumn<T>[];
  visible: Record<string, boolean>;
  onVisibleChange: (next: Record<string, boolean>) => void;
  label: string;
  resetLabel: string;
  iconOnly?: boolean;
};

export function ColumnChooser<T>({
  columns,
  visible,
  onVisibleChange,
  label,
  resetLabel,
  iconOnly,
}: Readonly<ColumnChooserProps<T>>) {
  const toggle = (key: string) => {
    onVisibleChange({ ...visible, [key]: !visible[key] });
  };

  const reset = () => {
    const next: Record<string, boolean> = {};
    for (const c of columns) next[c.key] = !c.defaultHidden;
    onVisibleChange(next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:text-foreground h-10 gap-1.5',
            iconOnly ? 'px-2.5' : 'px-3',
          )}
          aria-label={label}
        >
          <Columns3 className="h-4 w-4 shrink-0" />
          {!iconOnly && <span>{label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1">
        <DropdownMenuLabel className="text-muted-foreground px-2 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider uppercase">
          {label}
        </DropdownMenuLabel>
        {columns
          .filter((c) => c.key !== 'select' && c.key !== 'actions')
          .map((c) => {
            const isVisible = visible[c.key] ?? !c.defaultHidden;
            const disabled = !!c.required;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => !disabled && toggle(c.key)}
                disabled={disabled}
                className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm disabled:opacity-60"
              >
                <Checkbox
                  checked={disabled ? true : isVisible}
                  className="h-3.5 w-3.5"
                  tabIndex={-1}
                />
                <span className="flex-1 text-left">
                  {typeof c.label === 'string' ? c.label : c.key}
                </span>
              </button>
            );
          })}
        <DropdownMenuSeparator />
        <button
          type="button"
          onClick={reset}
          className="hover:bg-accent text-muted-foreground hover:text-foreground w-full rounded-sm px-2 py-1.5 text-left text-xs"
        >
          {resetLabel}
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
