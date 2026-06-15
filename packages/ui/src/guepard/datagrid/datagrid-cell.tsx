'use client';

import * as React from 'react';
import type { ColumnHeader } from '@guepard/domain/entities';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../shadcn/tooltip';
import { TableCell } from '../../shadcn/table';
import { cn } from '../../lib/utils';
import { formatCellForGrid, isDateTimeColumn } from './value-format';

interface DataGridCellProps {
  value: unknown;
  column: ColumnHeader;
  className?: string;
  style?: React.CSSProperties;
}

function isNumericOriginalType(
  originalType: string | null | undefined,
): boolean {
  if (!originalType) return false;
  const t = originalType.toUpperCase();
  return (
    t.includes('INT') ||
    t.includes('NUMERIC') ||
    t.includes('DECIMAL') ||
    t.includes('FLOAT') ||
    t.includes('DOUBLE') ||
    t.includes('REAL') ||
    t.includes('BIGINT') ||
    t.includes('SMALLINT') ||
    t.includes('TINYINT')
  );
}

function isNumericValue(value: unknown): boolean {
  if (typeof value === 'number' && !Number.isNaN(value)) return true;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return !Number.isNaN(n) && value.trim() !== '';
  }
  return false;
}

function isJsonColumn(column: ColumnHeader): boolean {
  const type = (column.type || column.originalType || '').toLowerCase();
  return type === 'json' || type === 'jsonb' || type.includes('json');
}

function getCellClassName(value: unknown, column: ColumnHeader): string {
  const isNull = value === null || value === undefined;
  const isDateTime = isDateTimeColumn(column);
  const isNumber =
    typeof value === 'number' ||
    column.type === 'number' ||
    column.type === 'integer' ||
    column.type === 'float' ||
    column.type === 'decimal' ||
    (isNumericOriginalType(column.originalType) && isNumericValue(value));
  const isBoolean = typeof value === 'boolean' || column.type === 'boolean';
  const isJson =
    (typeof value === 'object' && value !== null) || isJsonColumn(column);

  // Match Datakit: numbers=emerald, booleans=cyan, dates=violet, json=amber
  return cn(
    isNull && 'text-muted-foreground',
    isDateTime && 'whitespace-nowrap text-violet-700 dark:text-violet-400',
    isNumber &&
      'text-right font-mono text-emerald-700 tabular-nums dark:text-emerald-400',
    isBoolean && 'text-center text-cyan-700 dark:text-cyan-400',
    isJson && 'font-mono text-amber-700 dark:text-amber-400',
  );
}

export function DataGridCell({
  value,
  column,
  className,
  style,
}: DataGridCellProps) {
  const cellRef = React.useRef<HTMLTableCellElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  const { full, preview, tooltip, isNull, isTruncatedByValue } =
    formatCellForGrid(value, column, { maxPreviewChars: 32 });

  React.useEffect(() => {
    const checkIfTruncated = () => {
      if (cellRef.current) {
        const element = cellRef.current.querySelector('[data-cell-content]');
        if (element) {
          setIsTruncated(element.scrollWidth > element.clientWidth);
        }
      }
    };

    requestAnimationFrame(checkIfTruncated);

    const handleResize = () => {
      requestAnimationFrame(checkIfTruncated);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [value]);

  const cellContent = (
    <div
      data-cell-content
      className={cn('truncate', getCellClassName(value, column))}
    >
      {isNull ? <span className="text-muted-foreground">null</span> : preview}
    </div>
  );

  const showTooltip = Boolean(tooltip) || isTruncated || isTruncatedByValue;
  const tooltipText = (() => {
    const text = tooltip ?? full;
    const lines = text.split('\n');
    const maxLines = 40;
    const maxChars = 3_500;
    const limitedLines =
      lines.length > maxLines ? [...lines.slice(0, maxLines), '…'] : lines;
    const joined = limitedLines.join('\n');
    return joined.length > maxChars ? joined.slice(0, maxChars) + '…' : joined;
  })();

  return (
    <TableCell
      ref={cellRef}
      className={cn(
        'text-foreground border-border/70 overflow-hidden border-r border-b p-2 transition-colors',
        className,
      )}
      style={style}
    >
      {showTooltip ? (
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
            <TooltipContent className="max-h-[min(60vh,32rem)] max-w-[min(90vw,48rem)] overflow-hidden wrap-break-word">
              <pre className="font-mono text-xs whitespace-pre-wrap">
                {tooltipText}
              </pre>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        cellContent
      )}
    </TableCell>
  );
}
