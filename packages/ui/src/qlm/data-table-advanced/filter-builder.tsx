import { useMemo, useState } from 'react';
import { ChevronDown, Filter, Plus, Trash2 } from 'lucide-react';

import { Button } from '../../shadcn/button';
import { Input } from '../../shadcn/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../shadcn/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shadcn/select';
import { Separator } from '../../shadcn/separator';
import { cn } from '../../lib/utils';
import type {
  AdvancedColumn,
  FilterFieldKind,
  FilterOperator,
  FilterRule,
} from './types';

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'equals',
  notEquals: 'not equals',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  in: 'is one of',
  notIn: 'is not one of',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  between: 'between',
};

const OPERATORS_BY_KIND: Record<FilterFieldKind, FilterOperator[]> = {
  text: [
    'equals',
    'notEquals',
    'contains',
    'startsWith',
    'endsWith',
    'isEmpty',
    'isNotEmpty',
  ],
  number: [
    'equals',
    'notEquals',
    'gt',
    'gte',
    'lt',
    'lte',
    'isEmpty',
    'isNotEmpty',
  ],
  enum: ['in', 'notIn', 'isEmpty', 'isNotEmpty'],
  date: [
    'between',
    'equals',
    'gt',
    'gte',
    'lt',
    'lte',
    'isEmpty',
    'isNotEmpty',
  ],
};

function newRuleId(): string {
  return `r_${Math.random().toString(36).slice(2, 10)}`;
}

function rulesEqual(a: FilterRule[], b: FilterRule[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x.field !== y.field || x.operator !== y.operator) return false;
    if ((x.conjunction ?? 'and') !== (y.conjunction ?? 'and')) return false;
    const xv = JSON.stringify(x.value ?? null);
    const yv = JSON.stringify(y.value ?? null);
    if (xv !== yv) return false;
  }
  return true;
}

export type FilterBuilderProps<T> = {
  columns: AdvancedColumn<T>[];
  rules: FilterRule[];
  onChange: (rules: FilterRule[]) => void;
  triggerLabel: string;
  addRuleLabel: string;
  clearLabel: string;
  emptyLabel: string;
  enumAnyLabel?: string;
  enumCountLabel?: (count: number) => string;
  /** If provided, the builder becomes "draft" and requires explicit apply. */
  applyLabel?: string;
  cancelLabel?: string;
  maxRules?: number;
  maxRulesLabel?: (max: number) => string;
  iconOnly?: boolean;
};

export function FilterBuilder<T>({
  columns,
  rules,
  onChange,
  triggerLabel,
  addRuleLabel,
  clearLabel,
  emptyLabel,
  enumAnyLabel,
  enumCountLabel,
  applyLabel,
  cancelLabel,
  maxRules,
  maxRulesLabel,
  iconOnly,
}: Readonly<FilterBuilderProps<T>>) {
  const filterableCols = useMemo(
    () => columns.filter((c) => c.filter),
    [columns],
  );

  const requiresApply = !!applyLabel;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(rules);

  // Hydrate draft from controlled `rules` prop on each open transition.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDraft((prev) => (rulesEqual(prev, rules) ? prev : rules));
    }
  }

  const working = requiresApply ? draft : rules;
  const dirty = requiresApply && !rulesEqual(draft, rules);
  const activeCount = rules.length;

  const defaultValueForOperator = (
    op: FilterOperator,
    kind: FilterFieldKind,
  ): unknown => {
    if (op === 'isEmpty' || op === 'isNotEmpty') return null;
    if (op === 'between') return ['', ''];
    if (kind === 'enum') return [];
    return '';
  };

  const addRule = () => {
    const first = filterableCols[0];
    if (!first) return;
    const kind = first.filter!.kind;
    const op = OPERATORS_BY_KIND[kind][0]!;
    const next: FilterRule[] = [
      ...working,
      {
        id: newRuleId(),
        field: first.key,
        operator: op,
        value: defaultValueForOperator(op, kind),
        conjunction: 'and',
      },
    ];
    if (requiresApply) setDraft(next);
    else onChange(next);
  };

  const updateRule = (id: string, patch: Partial<FilterRule>) => {
    const next = working.map((r) => (r.id === id ? { ...r, ...patch } : r));
    if (requiresApply) setDraft(next);
    else onChange(next);
  };

  const removeRule = (id: string) => {
    const next = working.filter((r) => r.id !== id);
    if (requiresApply) setDraft(next);
    else onChange(next);
  };

  const clearAll = () => {
    if (requiresApply) {
      setDraft([]);
      return;
    }
    onChange([]);
  };

  const cancel = () => {
    setDraft(rules);
    setOpen(false);
  };

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!requiresApply) return;
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      apply();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:text-foreground h-10 cursor-pointer gap-2.5 rounded-none transition-all',
            iconOnly ? 'px-2.5' : 'px-4',
            activeCount > 0 && 'text-foreground bg-muted/20',
          )}
          aria-label={triggerLabel}
        >
          <Filter className="h-4 w-4 shrink-0" />
          {!iconOnly && (
            <span className="text-[11px] font-bold tracking-tight">
              {triggerLabel}
            </span>
          )}
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground inline-flex h-4 min-w-[17px] items-center justify-center rounded-none px-1 text-[9px] leading-4 font-black tabular-nums">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[440px] p-1"
        onKeyDown={onKeyDown}
      >
        {/* Header label */}
        <DropdownMenuLabel className="text-muted-foreground flex items-center gap-1.5 px-2 pt-1.5 pb-1 text-[11px] font-bold tracking-tight">
          {triggerLabel}
          {working.length > 0 && (
            <span className="bg-secondary text-secondary-foreground inline-flex h-4 min-w-[16px] items-center justify-center rounded-none px-1 text-[10px] leading-none font-bold tabular-nums">
              {working.length}
            </span>
          )}
        </DropdownMenuLabel>

        <Separator className="my-1" />

        {/* Rules */}
        {working.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="bg-muted border-border mb-3 flex h-10 w-10 items-center justify-center rounded-none border border-dashed">
              <Filter className="text-muted-foreground/40 h-5 w-5" />
            </div>
            <p className="text-muted-foreground mb-1 text-xs font-bold tracking-tight">
              {typeof emptyLabel === 'string' ? emptyLabel : 'No filters'}
            </p>
            <p className="text-muted-foreground/50 mb-4 text-[10px]">
              Filters help you isolate specific technical metrics and states.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={addRule}
              className="border-border bg-background hover:bg-muted/30 h-8 rounded-none border px-4 text-[11px] font-bold tracking-tight shadow-none"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {addRuleLabel}
            </Button>
          </div>
        ) : (
          <div className="mt-1 flex flex-col gap-2 px-2 pb-2">
            {working.map((rule, index) => {
              const col = filterableCols.find((c) => c.key === rule.field);
              const kind = col?.filter?.kind ?? 'text';
              const ops = OPERATORS_BY_KIND[kind];
              const isNullary =
                rule.operator === 'isEmpty' || rule.operator === 'isNotEmpty';
              return (
                <div
                  key={rule.id}
                  className="group hover:border-primary/40 hover:bg-muted/30 relative mb-1 flex flex-col gap-1.5 border-l-2 border-transparent px-2 py-3 transition-all last:mb-0"
                >
                  <div className="flex items-center gap-2">
                    {/* Logic Keyway */}
                    <div className="w-12 shrink-0">
                      {index === 0 ? (
                        <span className="text-muted-foreground/60 text-[10px] font-bold tracking-tight uppercase">
                          WHERE
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            updateRule(rule.id, {
                              conjunction:
                                rule.conjunction === 'or' ? 'and' : 'or',
                            })
                          }
                          className={cn(
                            'rounded-none px-1.5 py-0.5 text-[10px] font-bold tracking-tighter uppercase transition-colors',
                            rule.conjunction === 'or'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-muted text-muted-foreground hover:bg-foreground hover:text-background',
                          )}
                        >
                          {rule.conjunction === 'or' ? 'OR' : 'AND'}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-1 items-center gap-2">
                      <Select
                        value={rule.field}
                        onValueChange={(field) => {
                          const nextCol = filterableCols.find(
                            (c) => c.key === field,
                          );
                          const nextKind = nextCol?.filter?.kind ?? 'text';
                          updateRule(rule.id, {
                            field,
                            operator: OPERATORS_BY_KIND[nextKind][0]!,
                            value: nextKind === 'enum' ? [] : '',
                          });
                        }}
                      >
                        <SelectTrigger className="border-border bg-background focus:border-primary h-8 flex-1 rounded-none border px-3 text-[11px] font-bold tracking-tight shadow-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border">
                          {filterableCols.map((c) => (
                            <SelectItem
                              key={c.key}
                              value={c.key}
                              className="px-3 py-2 text-[11px] font-bold tracking-tight"
                            >
                              {/* Using the label or the key if not providing it */}
                              {typeof c.label === 'string' ? c.label : c.key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={rule.operator}
                        onValueChange={(op) => {
                          const nextOp = op as FilterOperator;
                          const valueSwitched =
                            (rule.operator === 'between') !==
                              (nextOp === 'between') ||
                            (rule.operator === 'isEmpty' ||
                              rule.operator === 'isNotEmpty') !==
                              (nextOp === 'isEmpty' || nextOp === 'isNotEmpty');
                          updateRule(rule.id, {
                            operator: nextOp,
                            ...(valueSwitched && {
                              value: defaultValueForOperator(nextOp, kind),
                            }),
                          });
                        }}
                      >
                        <SelectTrigger className="border-border bg-background focus:border-primary h-8 w-[120px] shrink-0 rounded-none border px-3 text-[11px] font-bold tracking-tight shadow-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border">
                          {ops.map((op) => (
                            <SelectItem
                              key={op}
                              value={op}
                              className="px-3 py-2 text-[11px] font-bold tracking-tight"
                            >
                              {OPERATOR_LABELS[op]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      className="text-muted-foreground/30 hover:text-destructive ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-none opacity-0 transition-all group-hover:opacity-100 focus:opacity-100"
                      aria-label="Remove rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {!isNullary && (
                    <div className="flex gap-2">
                      <div className="w-12 shrink-0" />
                      <div className="flex-1">
                        <RuleValueInput
                          rule={rule}
                          col={col}
                          onChange={(value) => updateRule(rule.id, { value })}
                          enumAnyLabel={enumAnyLabel}
                          enumCountLabel={enumCountLabel}
                        />
                      </div>
                      <div className="w-6 shrink-0" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Separator className="my-1" />

        {/* Footer: icon-only clear + add + apply/cancel */}
        <div className="flex items-center gap-1 px-2 py-1">
          {working.length > 0 && (
            <button
              type="button"
              title={clearLabel}
              aria-label={clearLabel}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearAll();
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-none transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {(maxRules === undefined || working.length < maxRules) &&
            filterableCols.length > 0 && (
              <button
                type="button"
                title={addRuleLabel}
                aria-label={addRuleLabel}
                onClick={addRule}
                className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-none transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          {maxRules !== undefined && working.length >= maxRules && (
            <p className="text-muted-foreground/60 text-[11px]">
              {maxRulesLabel
                ? maxRulesLabel(maxRules)
                : `Max ${maxRules} filters`}
            </p>
          )}
          {requiresApply && (
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 bg-background h-8 rounded-none border px-3 text-[10px] font-bold tracking-tight shadow-none"
                onClick={cancel}
              >
                {cancelLabel ?? 'CANCEL'}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-none border border-transparent px-4 text-[10px] font-bold tracking-tight shadow-none"
                disabled={!dirty}
                onClick={apply}
              >
                {applyLabel}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RuleValueInput<T>({
  rule,
  col,
  onChange,
  enumAnyLabel,
  enumCountLabel,
}: {
  rule: FilterRule;
  col: AdvancedColumn<T> | undefined;
  onChange: (value: unknown) => void;
  enumAnyLabel?: string;
  enumCountLabel?: (count: number) => string;
}) {
  if (rule.operator === 'isEmpty' || rule.operator === 'isNotEmpty') {
    return (
      <div className="text-muted-foreground/50 flex h-7 items-center px-1 text-[11px]">
        —
      </div>
    );
  }

  const kind = col?.filter?.kind ?? 'text';

  if (kind === 'enum') {
    const options = col?.filter?.options ?? [];
    const selected = Array.isArray(rule.value) ? (rule.value as string[]) : [];
    const toggle = (value: string) => {
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      onChange(next);
    };

    const label =
      selected.length === 0
        ? (enumAnyLabel ?? '—')
        : selected.length === 1
          ? selected[0]!
          : enumCountLabel
            ? enumCountLabel(selected.length)
            : `${selected.length}`;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="bg-background border-border hover:bg-muted/30 h-8 w-full justify-between gap-2 rounded-none border px-3 text-[11px] font-bold tracking-tight shadow-none"
          >
            <span className="truncate">{label}</span>
            <span className="flex shrink-0 items-center gap-1">
              {selected.length > 0 && (
                <span className="bg-primary text-primary-foreground inline-flex h-4 min-w-[14px] items-center justify-center rounded-none px-1 text-[9px] leading-4 font-black tabular-nums">
                  {selected.length}
                </span>
              )}
              <ChevronDown className="text-muted-foreground h-3 w-3" />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52 rounded-none border">
          <DropdownMenuLabel className="text-muted-foreground px-3 py-2 text-[11px] font-bold tracking-tight">
            {typeof col?.label === 'string' ? col.label : (col?.key ?? '')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={active}
                onCheckedChange={() => toggle(opt.value)}
                className="cursor-pointer gap-2.5 rounded-none px-3 py-2 text-[11px] font-bold tracking-tight"
              >
                {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                {opt.label}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (rule.operator === 'between') {
    const range = Array.isArray(rule.value)
      ? (rule.value as string[])
      : ['', ''];
    const from = range[0] ?? '';
    const to = range[1] ?? '';
    return (
      <div className="flex items-center gap-1">
        <Input
          type="date"
          value={from}
          onChange={(e) => onChange([e.target.value, to])}
          className="border-border bg-background focus:border-primary h-8 flex-1 rounded-none border px-2 text-[11px] font-bold tracking-tight focus:ring-0"
        />
        <span className="text-muted-foreground shrink-0 px-1 text-[10px]">
          –
        </span>
        <Input
          type="date"
          value={to}
          onChange={(e) => onChange([from, e.target.value])}
          className="border-border bg-background focus:border-primary h-8 flex-1 rounded-none border px-2 text-[11px] font-bold tracking-tight focus:ring-0"
        />
      </div>
    );
  }

  return (
    <Input
      value={
        typeof rule.value === 'string' || typeof rule.value === 'number'
          ? String(rule.value)
          : ''
      }
      onChange={(e) =>
        onChange(kind === 'number' ? Number(e.target.value) : e.target.value)
      }
      type={kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text'}
      placeholder="Value"
      className="border-border bg-background focus:border-primary h-8 w-full rounded-none border px-3 text-[11px] font-bold tracking-tight shadow-none focus:ring-0"
    />
  );
}
