import { useTranslation } from 'react-i18next';

import type { DatasourceMetadata } from '@guepard/extensions-sdk';
import { SchemaGraph } from '@guepard/ui/schema-graph';

export interface DatasourceSchemaPanelProps {
  metadata: DatasourceMetadata | null | undefined;
  isLoading?: boolean;
  isError?: boolean;
  /**
   * Storage key used to persist the graph layout across reloads.
   * Typically `datasource-schema-positions:${datasource.id}`.
   */
  storageKey?: string;
}

/**
 * Schema graph view for the datasource detail page. Renders the shared
 * `<SchemaGraph>` component with the loaded metadata.
 */
export function DatasourceSchemaPanel({
  metadata,
  isLoading = false,
  isError = false,
  storageKey,
}: Readonly<DatasourceSchemaPanelProps>) {
  const { t } = useTranslation('datasources');

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      </div>
    );
  }

  if (isError || !metadata) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          {t('schema.error', {
            defaultValue: 'Failed to load datasource metadata.',
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <SchemaGraph metadata={metadata} storageKey={storageKey} />
    </div>
  );
}
