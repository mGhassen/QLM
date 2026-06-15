import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between';

export type FilterFieldKind = 'text' | 'number' | 'enum' | 'date';

/** Describes a filterable column as far as the filter builder is concerned. */
export type FilterField = {
  key: string;
  label: string;
  kind: FilterFieldKind;
  options?: Array<{
    value: string;
    label: string;
    icon?: ReactNode;
    activeClassName?: string;
  }>;
};

/** One rule in the active filter. Value shape depends on the operator. */
export type FilterRule = {
  id: string;
  field: string;
  operator: FilterOperator;
  /** string | number | string[] | null — the applier coerces per operator. */
  value: unknown;
  conjunction?: 'and' | 'or';
};

export type SortState = {
  key: string;
  direction: 'asc' | 'desc';
};

export type AdvancedColumn<T> = {
  key: string;
  label: ReactNode;
  filter?: Omit<FilterField, 'key' | 'label'> & {
    accessor?: (row: T) => unknown;
  };
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number | Date | null | undefined;
  width?: string;
  minWidthPx?: number;
  maxWidthPx?: number;
  /** When true, column expands to fill remaining table width instead of using its computed/auto-fit width. */
  grow?: boolean;
  truncate?: boolean;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => ReactNode;
  exportCell?: (row: T) => string;
  measureCell?: (row: T) => string;
  required?: boolean;
  defaultHidden?: boolean;
};

export type BulkAction<T> = {
  id: string;
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  overflow?: boolean;
  confirm?: {
    title: string;
    description: string | ((rows: T[]) => string);
    confirmLabel: string;
    cancelLabel: string;
  };
  /** Disables the action button when it returns true for the current selection. */
  isDisabled?: (rows: T[]) => boolean;
  run: (rows: T[]) => void | Promise<void>;
};
