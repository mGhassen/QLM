import { Skeleton } from '@qlm/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@qlm/ui/table';
import { type AdvancedColumn } from '@qlm/ui/data-table-advanced';
import { cn } from '@qlm/ui/utils';

export function EntityLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-none" />
      ))}
    </div>
  );
}

export function EntityLoadingTableSkeleton<T>({
  columns,
  visible,
  rows,
}: Readonly<{
  columns: AdvancedColumn<T>[];
  visible: Record<string, boolean>;
  rows: number;
}>) {
  const visibleCols = columns.filter((c) => visible[c.key] ?? !c.defaultHidden);

  return (
    <div className="border-border bg-card overflow-hidden rounded-none border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead
              className="bg-card sticky left-0 z-40 w-[44px] pr-0"
              style={{ left: 0 }}
            >
              <div className="h-4 w-4" />
            </TableHead>
            {visibleCols.map((c) => (
              <TableHead
                key={c.key}
                className={cn(
                  'text-muted-foreground text-xs font-medium',
                  c.key === 'name' && 'bg-card sticky left-[44px] z-30',
                )}
                style={
                  c.key === 'name'
                    ? { position: 'sticky', left: 44 }
                    : undefined
                }
              >
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, idx) => (
            <TableRow key={idx}>
              <TableCell
                className="bg-card sticky left-0 z-30 pr-0 align-middle"
                style={{ left: 0 }}
              >
                <Skeleton className="h-4 w-4 rounded-none" />
              </TableCell>
              {visibleCols.map((c) => (
                <TableCell
                  key={c.key}
                  className={cn(
                    'align-middle',
                    c.key === 'name' && 'bg-card sticky left-[44px] z-20',
                  )}
                  style={
                    c.key === 'name'
                      ? { position: 'sticky', left: 44 }
                      : undefined
                  }
                >
                  <Skeleton className="h-4 w-[70%]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function EntityLoadingCardsSkeleton({
  count,
}: Readonly<{
  count: number;
}>) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: Math.min(count, 12) }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card border-border flex flex-col gap-3 rounded-none border p-4"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 shrink-0 rounded-none" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-6 shrink-0 rounded-none" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 w-2 shrink-0 rounded-none" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
