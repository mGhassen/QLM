import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Region } from '@qlm/domain/usecases';
import { Alert, AlertDescription, AlertTitle } from '@qlm/ui/alert';
import { Button } from '@qlm/ui/button';

export type IntegrationRegionsPanelProps = Readonly<{
  regions: Region[] | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}>;

export function IntegrationRegionsPanel(
  props: IntegrationRegionsPanelProps,
): React.ReactElement {
  const { t } = useTranslation('integrations');
  const { regions, isLoading, error, onRetry } = props;

  return (
    <div className="border-border bg-background flex flex-col gap-4 rounded-lg border p-6">
      <h2 className="text-foreground text-base font-semibold">
        {t('detail.regionsHeading')}
      </h2>

      {isLoading && (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{t('form.testingCta')}</span>
        </div>
      )}

      {!isLoading && error !== null && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>{t('regions.loadError')}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{error}</span>
            <div>
              <Button size="sm" variant="outline" onClick={onRetry}>
                {t('detail.retryCta')}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading &&
        error === null &&
        regions !== null &&
        regions.length === 0 && (
          <p className="text-muted-foreground text-sm">{t('regions.empty')}</p>
        )}

      {!isLoading &&
        error === null &&
        regions !== null &&
        regions.length > 0 && (
          <ul
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
            data-test="integration-regions-list"
          >
            {regions.map((region) => (
              <li
                key={region.id}
                className="border-border bg-muted/30 flex flex-col rounded-md border px-3 py-2"
              >
                <span className="text-foreground font-mono text-xs">
                  {region.id}
                </span>
                <span className="text-muted-foreground mt-0.5 truncate text-xs">
                  {region.name}
                </span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
