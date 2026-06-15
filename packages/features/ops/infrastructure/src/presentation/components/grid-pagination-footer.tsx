import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@guepard/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@guepard/ui/select';

type GridPaginationFooterProps = Readonly<{
  pageIndex: number;
  pageSize: number;
  totalRows: number;
  totalUnfiltered: number;
  gridCols: 1 | 2 | 3;
  onPageIndexChange: (updater: ((prev: number) => number) | number) => void;
  onPageSizeChange: (n: number) => void;
  onGridColsChange: (n: 1 | 2 | 3) => void;
}>;

export function GridPaginationFooter({
  pageIndex,
  pageSize,
  totalRows,
  totalUnfiltered,
  gridCols,
  onPageIndexChange,
  onPageSizeChange,
  onGridColsChange,
}: GridPaginationFooterProps) {
  const { t } = useTranslation('nodes', { keyPrefix: 'pagination' });
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);
  const canPrev = pageIndex > 0;
  const canNext = to < totalRows;
  return (
    <div className="border-border shrink-0 border-x border-t bg-card px-3 py-2 flex items-center">
      <div className="flex-1">
        <p className="text-muted-foreground text-xs tabular-nums">
          {t('showing', {
            from,
            to,
            total: totalRows,
          })}
          {totalRows < totalUnfiltered && (
            <span className="ml-1 opacity-60">
              {t('ofTotal', { total: totalUnfiltered })}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canPrev}
          onClick={() => onPageIndexChange((p) => p - 1)}
          aria-label={t('prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canNext}
          onClick={() => onPageIndexChange((p) => p + 1)}
          aria-label={t('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">
        <Select
          value={String(gridCols)}
          onValueChange={(v) => onGridColsChange(Number(v) as 1 | 2 | 3)}
        >
          <SelectTrigger className="h-7 w-14 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3].map((opt) => (
              <SelectItem key={opt} value={String(opt)} className="text-xs">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-xs mr-4">{t('colsPerRow')}</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            onPageSizeChange(Number(v));
            onPageIndexChange(0);
          }}
        >
          <SelectTrigger className="h-7 w-16 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((opt) => (
              <SelectItem key={opt} value={String(opt)} className="text-xs">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-xs">{t('rowsPerPage')}</span>
      </div>
    </div>
  );
}
