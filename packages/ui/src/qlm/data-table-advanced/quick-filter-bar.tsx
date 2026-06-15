import { Fragment, useMemo } from 'react';
import { RotateCcw, Settings2 } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import { cn } from '../../lib/utils';
import type { AdvancedColumn, FilterRule } from './types';

export type QuickFilterBarProps<T> = {
  columns: AdvancedColumn<T>[];
  /** Enum column keys currently shown as chip groups. */
  pinnedKeys: string[];
  onPinnedChange?: (keys: string[]) => void;
  /** Full unfiltered row set — for per-option counts. */
  rows: T[];
  rules: FilterRule[];
  onChange: (rules: FilterRule[]) => void;
  configureLabel?: string;
  columnPickerLabel?: string;
  resetLabel?: string;
  preserveOnClear?: string[];
};

export function QuickFilterBar<T>({
  columns,
  pinnedKeys,
  onPinnedChange,
  rows,
  rules,
  onChange,
  configureLabel = 'Configure quick filters',
  columnPickerLabel = 'Quick filters',
  resetLabel = 'Reset filters',
  preserveOnClear,
}: Readonly<QuickFilterBarProps<T>>) {
  const enumCols = useMemo(
    () =>
      columns.filter(
        (c) => c.filter?.kind === 'enum' && (c.filter.options?.length ?? 0) > 0,
      ),
    [columns],
  );

  const pinnedCols = useMemo(
    () =>
      pinnedKeys
        .map((k) => enumCols.find((c) => c.key === k))
        .filter((c): c is AdvancedColumn<T> => c !== undefined),
    [enumCols, pinnedKeys],
  );

  const counts = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    for (const col of pinnedCols) {
      const opts = col.filter!.options!;
      const counter: Record<string, number> = {};
      for (const opt of opts) counter[opt.value] = 0;
      const accessor =
        col.filter!.accessor ??
        ((row: T) => (row as Record<string, unknown>)[col.key]);
      for (const row of rows) {
        const raw = accessor(row);
        const vals = Array.isArray(raw) ? raw : [raw];
        for (const v of vals) {
          const key = String(v ?? '');
          if (Object.prototype.hasOwnProperty.call(counter, key))
            counter[key] = (counter[key] ?? 0) + 1;
        }
      }
      result[col.key] = counter;
    }
    return result;
  }, [pinnedCols, rows]);

  const toggleOption = (fieldKey: string, value: string) => {
    const existing = rules.find(
      (r) => r.field === fieldKey && r.operator === 'in',
    );
    if (!existing) {
      onChange([
        ...rules,
        {
          id: `r_${crypto.randomUUID().slice(0, 8)}`,
          field: fieldKey,
          operator: 'in' as const,
          value: [value],
        },
      ]);
      return;
    }
    const current = Array.isArray(existing.value)
      ? (existing.value as string[])
      : [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    if (next.length === 0) {
      onChange(rules.filter((r) => r.id !== existing.id));
    } else {
      onChange(
        rules.map((r) => (r.id === existing.id ? { ...r, value: next } : r)),
      );
    }
  };

  const togglePin = (key: string) => {
    const next = pinnedKeys.includes(key)
      ? pinnedKeys.filter((k) => k !== key)
      : [...pinnedKeys, key];
    onPinnedChange?.(next);
  };

  const hasContent =
    pinnedCols.length > 0 || (onPinnedChange && enumCols.length > 0);
  if (!hasContent) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pinnedCols.map((col, fieldIndex) => {
        const opts = col.filter!.options!;
        const activeRule = rules.find(
          (r) => r.field === col.key && r.operator === 'in',
        );
        const activeValues = Array.isArray(activeRule?.value)
          ? (activeRule.value as string[])
          : [];
        const fieldCounts = counts[col.key] ?? {};

        return (
          <Fragment key={col.key}>
            {fieldIndex > 0 && (
              <span
                className="bg-border/60 mx-1 h-3.5 w-[2px] shrink-0 self-center"
                aria-hidden
              />
            )}
            {opts.map((opt) => {
              const isActive = activeValues.includes(opt.value);
              const count = fieldCounts[opt.value] ?? 0;

              return (
                <button
                  key={`${col.key}:${opt.value}`}
                  type="button"
                  onClick={() => toggleOption(col.key, opt.value)}
                  className={cn(
                    'inline-flex h-8 cursor-pointer items-center gap-2.5 rounded-none border px-3 text-[11px] font-bold tracking-tight transition-all',
                    isActive
                      ? (opt.activeClassName ??
                          'border-primary bg-primary/20 text-primary shadow-[0_0_12px_-4px_rgba(var(--primary),0.5)]')
                      : 'border-border bg-muted/20 text-foreground/70 hover:border-foreground/40 hover:bg-muted/40 hover:text-foreground',
                  )}
                >
                  {opt.icon !== undefined && (
                    <span className="mt-[-1px] shrink-0 opacity-100">
                      {opt.icon}
                    </span>
                  )}
                  <span className="leading-none">{opt.label}</span>
                  <span className="mb-[-1px] ml-1 text-[9px] leading-none tabular-nums opacity-60">
                    {count}
                  </span>
                </button>
              );
            })}
          </Fragment>
        );
      })}

      {onPinnedChange && enumCols.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={configureLabel}
              className="text-muted-foreground/60 hover:text-foreground hover:bg-muted hover:border-border inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-none border border-transparent transition-all"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="border-border w-80 rounded-none border p-0 shadow-xl"
          >
            <div className="bg-muted/20 flex items-center justify-between gap-3 px-3 py-2.5">
              <DropdownMenuLabel className="text-muted-foreground/60 p-0 text-[10px] font-bold">
                {columnPickerLabel}
              </DropdownMenuLabel>
              {pinnedKeys.some((k) => rules.some((r) => r.field === k)) && (
                <button
                  type="button"
                  aria-label={resetLabel}
                  title={resetLabel}
                  className="text-muted-foreground/40 hover:text-destructive flex cursor-pointer items-center justify-center transition-colors"
                  onClick={() =>
                    onChange(
                      rules.filter(
                        (r) =>
                          preserveOnClear?.includes(r.field) ||
                          !pinnedKeys.includes(r.field),
                      ),
                    )
                  }
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <DropdownMenuSeparator className="bg-border/60 m-0 h-[2px]" />
            <div className="p-1">
              {enumCols.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={pinnedKeys.includes(col.key)}
                  onCheckedChange={() => togglePin(col.key)}
                  className="focus:bg-foreground focus:text-background cursor-pointer rounded-none py-2 text-xs font-semibold transition-colors"
                >
                  {typeof col.label === 'string' ? col.label : col.key}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
