import { type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

import { cn } from '../../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../shadcn/table';

export type EntityListSortDirection = 'asc' | 'desc';

export type EntityListColumn<T> = {
  /** Stable key — used as the `sortBy` value. */
  key: string;
  label: ReactNode;
  /** Column alignment. Defaults to 'left'. */
  align?: 'left' | 'center' | 'right';
  /** CSS width (e.g. '40%', '200px'). */
  width?: string;
  /** If true, clicking the header toggles sort direction or switches sort column. */
  sortable?: boolean;
  /** Renders the cell content for one row. */
  render: (item: T) => ReactNode;
};

export type EntityListTableProps<T> = {
  columns: EntityListColumn<T>[];
  items: T[];
  /** Unique id extractor. */
  getRowId: (item: T) => string;
  /** Row click handler. */
  onRowClick?: (item: T) => void;
  /** Current sort column key. */
  sortBy?: string;
  sortDirection?: EntityListSortDirection;
  /** Called when a sortable header is clicked. */
  onSortChange?: (key: string) => void;
  className?: string;
};

export function EntityListTable<T>({
  columns,
  items,
  getRowId,
  onRowClick,
  sortBy,
  sortDirection = 'desc',
  onSortChange,
  className,
}: Readonly<EntityListTableProps<T>>) {
  return (
    <div
      className={cn(
        'border-border bg-card overflow-hidden rounded-lg border',
        className,
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => {
              const isSorted = sortBy === col.key;
              const alignClass =
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';
              return (
                <TableHead
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'text-muted-foreground text-xs font-medium',
                    alignClass,
                    col.sortable && 'cursor-pointer select-none',
                  )}
                  onClick={
                    col.sortable && onSortChange
                      ? () => onSortChange(col.key)
                      : undefined
                  }
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      col.align === 'right' && 'justify-end',
                      col.align === 'center' && 'justify-center',
                    )}
                  >
                    {col.label}
                    {col.sortable && isSorted && (
                      <span
                        className="text-primary"
                        aria-label={`Sorted ${sortDirection}`}
                      >
                        {sortDirection === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </span>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-muted-foreground h-32 text-center text-sm"
              >
                No items
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow
                key={getRowId(item)}
                className={cn(onRowClick && 'hover:bg-muted/30 cursor-pointer')}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((col) => {
                  const alignClass =
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : '';
                  return (
                    <TableCell key={col.key} className={alignClass}>
                      {col.render(item)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
