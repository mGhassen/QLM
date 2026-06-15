import { ChevronDown } from 'lucide-react';

import { Badge } from '@guepard/ui/badge';
import { Button } from '@guepard/ui/button';
import { Checkbox } from '@guepard/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@guepard/ui/popover';

export type FilterPopoverProps<T extends string> = {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  selected: ReadonlyArray<T>;
  onChange: (next: T[]) => void;
};

/**
 * Generic multi-select popover used by the toolbar's Status + Scopes
 * filters. Lives here (not `@guepard/ui`) because phase 1 has only one
 * consumer; if a second appears we promote it.
 *
 * - Fully controlled: `selected` is the source of truth, `onChange` emits
 *   the new array on every toggle.
 * - The emitted array is sorted in option-declaration order so parents can
 *   compare arrays cheaply for dirty-checking and React-Query keys.
 * - Selected count appears as an inline `<Badge>` only when ≥1 selected.
 */
export function FilterPopover<T extends string>({
  label,
  options,
  selected,
  onChange,
}: Readonly<FilterPopoverProps<T>>) {
  const selectedSet = new Set(selected);
  const count = selectedSet.size;

  const toggle = (value: T) => {
    const next = new Set(selectedSet);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    // Re-emit in option-declaration order so parents see stable arrays.
    onChange(options.filter((o) => next.has(o.value)).map((o) => o.value));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span>{label}</span>
          {count > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-xs">
              {count}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <ul className="flex flex-col gap-1">
          {options.map((option) => {
            const id = `filter-popover-${label}-${option.value}`;
            return (
              <li key={option.value}>
                <label
                  htmlFor={id}
                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                >
                  <Checkbox
                    id={id}
                    checked={selectedSet.has(option.value)}
                    onCheckedChange={() => toggle(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
