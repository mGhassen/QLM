import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Column, Table } from '@qlm/domain/entities';
import type { DatasourceMetadata } from '@qlm/extensions-sdk';
import { Tables, type TableListItem } from '@qlm/ui/qlm/datasource/tables';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qlm/ui/select';

export interface DatasourceTablesPanelProps {
  metadata: DatasourceMetadata | null | undefined;
  isLoading?: boolean;
  isError?: boolean;
  onTableClick?: (table: Table) => void;
}

/**
 * Tables view for the datasource detail page. Reads the metadata the
 * shell runtime provides and displays a schema filter + tables list.
 */
export function DatasourceTablesPanel({
  metadata,
  isLoading = false,
  isError = false,
  onTableClick,
}: Readonly<DatasourceTablesPanelProps>) {
  const { t } = useTranslation('datasources');
  const [selectedSchema, setSelectedSchema] = useState<string>('all');

  const schemas = useMemo(() => {
    if (!metadata?.schemas) return [];
    return Array.from(new Set(metadata.schemas.map((s) => s.name))).sort();
  }, [metadata]);

  const filteredTables = useMemo<Table[]>(() => {
    if (!metadata?.tables) return [];
    const tables = metadata.tables as Table[];
    if (selectedSchema === 'all') return tables;
    return tables.filter((table) => table.schema === selectedSchema);
  }, [metadata, selectedSchema]);

  const tableListItems: TableListItem[] = useMemo(() => {
    const allColumns = (metadata?.columns ?? []) as Column[];
    return filteredTables.map((table) => {
      const columnCount = allColumns.filter(
        (col) => col.table_id === table.id && col.table === table.name,
      ).length;
      return {
        tableName: table.name,
        description: table.comment,
        rowsEstimated: table.live_rows_estimate ?? 0,
        sizeEstimated: table.size ?? '0 B',
        numberOfColumns: columnCount,
      };
    });
  }, [filteredTables, metadata]);

  const handleTableClick = (item: TableListItem) => {
    const table = filteredTables.find((tbl) => tbl.name === item.tableName);
    if (table && onTableClick) onTableClick(table);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      </div>
    );
  }

  if (isError || !metadata) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">
          {t('tables.error', { defaultValue: 'Failed to load tables' })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {t('tables.title', { defaultValue: 'Tables' })}
        </h1>
        {schemas.length > 0 && (
          <Select value={selectedSchema} onValueChange={setSelectedSchema}>
            <SelectTrigger className="w-[200px]">
              <SelectValue
                placeholder={t('tables.filter.schema', {
                  defaultValue: 'Filter by schema',
                })}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('tables.filter.all', { defaultValue: 'All schemas' })}
              </SelectItem>
              {schemas.map((schema) => (
                <SelectItem key={schema} value={schema}>
                  {schema}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <Tables tables={tableListItems} onTableClick={handleTableClick} />
    </div>
  );
}
