import { X } from 'lucide-react';

import type { AdvancedColumn, FilterOperator, FilterRule } from './types';

const SHORT_OP: Record<FilterOperator, string> = {
  equals: '=',
  notEquals: '≠',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  between: 'between',
  in: 'is',
  notIn: 'is not',
  isEmpty: 'is empty',
  isNotEmpty: 'not empty',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
};

function ruleValueLabel(rule: FilterRule): string | null {
  if (rule.operator === 'isEmpty' || rule.operator === 'isNotEmpty')
    return null;
  if (Array.isArray(rule.value)) {
    const arr = rule.value as string[];
    return arr.length === 0 ? null : arr.join(', ');
  }
  if (rule.value === '' || rule.value === null || rule.value === undefined) {
    return null;
  }
  return String(rule.value);
}

export type FilterChipRowProps<T> = {
  rules: FilterRule[];
  columns: AdvancedColumn<T>[];
  onChange: (rules: FilterRule[]) => void;
  clearLabel: string;
  removeRuleAriaLabel: string;
};

export function FilterChipRow<T>({
  rules,
  columns,
  onChange,
  clearLabel,
  removeRuleAriaLabel,
}: Readonly<FilterChipRowProps<T>>) {
  if (rules.length === 0) return null;

  const removeRule = (id: string) => onChange(rules.filter((r) => r.id !== id));

  return (
    <div className="flex min-h-7 flex-wrap items-center gap-2">
      {rules.map((rule, index) => {
        const col = columns.find((c) => c.key === rule.field);
        const fieldLabel =
          typeof col?.label === 'string' ? col.label : rule.field;
        const opLabel = SHORT_OP[rule.operator];
        const valueLabel = ruleValueLabel(rule);
        const isOr = index > 0 && rule.conjunction === 'or';

        return (
          <span
            key={rule.id}
            className="inline-flex items-center gap-1.5 pt-1 pb-1"
          >
            {isOr && (
              <span className="px-1 text-[11px] font-bold tracking-tight text-blue-500/80 select-none">
                {'// or'}
              </span>
            )}
            <span className="group/chip relative inline-flex h-6 items-center gap-2.5 pr-1 pl-2.5 transition-all">
              {/* Left Accent Bar */}
              <span className="bg-primary/80 absolute top-0 bottom-0 left-0 w-[3px] shadow-[0_0_8px_rgba(var(--primary),0.4)]" />

              {/* Content */}
              <span className="flex items-baseline gap-1.5">
                <span className="text-muted-foreground/60 text-[10px] font-bold tracking-tight">
                  {fieldLabel}
                </span>
                <span className="text-primary/70 pb-0.5 text-[8px] font-bold">
                  {opLabel}
                </span>
                <span className="text-foreground max-w-[120px] truncate text-[11px] font-bold tracking-tight">
                  {valueLabel ?? '—'}
                </span>
              </span>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => removeRule(rule.id)}
                className="text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 ml-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-none transition-all"
                aria-label={removeRuleAriaLabel}
              >
                <X className="h-3 w-3" />
              </button>

              {/* Ghost Background */}
              <span className="bg-primary/3 group-hover/chip:bg-primary/7 absolute inset-0 -z-10 transition-colors" />
            </span>
          </span>
        );
      })}
      {rules.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-muted-foreground/40 hover:text-destructive border-border hover:border-destructive/20 ml-2 h-6 cursor-pointer border-l px-2 text-[10px] font-bold tracking-tight transition-all"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
