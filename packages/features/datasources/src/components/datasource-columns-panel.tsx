import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

import type { Column, Table } from '@guepard/domain/entities';
import type { DatasourceMetadata } from '@guepard/extensions-sdk';
import { Button } from '@guepard/ui/button';
import {
  Columns,
  type ColumnListItem,
} from '@guepard/ui/guepard/datasource/columns';

export interface DatasourceColumnsPanelProps {
  metadata: DatasourceMetadata | null | undefined;
  /** The table whose columns we're drilling into. */
  table: Table;
  onBack: () => void;
  isLoading?: boolean;
  isError?: boolean;
}

/**
 * Columns drill-down view for the datasource detail page. Filters the
 * already-loaded metadata by table id + name and passes the projected
 * rows to the shared `Columns` primitive.
 *
 * Matches the 4-field display qwery-enterprise uses
 * (name / description / data type / format). The raw `Column` entity
 * carries richer fields (`is_nullable`, `is_unique`, `default_value`,
 * `check`, `enums`, …) — those are intentionally not rendered here;
 * add them to `ColumnListItem` + `<Columns>` when the UX calls for it.
 */
export function DatasourceColumnsPanel({
  metadata,
  table,
  onBack,
  isLoading = false,
  isError = false,
}: Readonly<DatasourceColumnsPanelProps>) {
  const { t } = useTranslation('datasources');

  const columnItems: ColumnListItem[] = useMemo(() => {
    const allColumns = (metadata?.columns ?? []) as Column[];
    return allColumns
      .filter((col) => col.table_id === table.id && col.table === table.name)
      .map((col) => ({
        name: col.name,
        description: col.comment,
        dataType: col.data_type,
        format: col.format,
      }));
  }, [metadata, table]);

  const header = (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="h-4 w-4" />
        {t('tables.back', { defaultValue: 'Back' })}
      </Button>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold">{table.name}</h1>
        {table.schema && (
          <p className="text-muted-foreground text-sm">{table.schema}</p>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {header}
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground text-sm">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (isError || !metadata) {
    return (
      <div className="space-y-4 p-6">
        {header}
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground text-sm">
            {t('columns.error', {
              defaultValue: 'Failed to load columns',
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {header}
      <Columns columns={columnItems} />
    </div>
  );
}
