import { useTranslation } from 'react-i18next';

import type { IntegrationConnectionOutput } from '@qlm/domain/usecases';

import { formatTimeAgo } from '../lib/format-time-ago';
import { IntegrationRowMenu } from './integration-row-menu';
import { IntegrationStatusBadge } from './integration-status-badge';
import { ProviderLogo } from './provider-logo';

export type IntegrationCardProps = Readonly<{
  integration: IntegrationConnectionOutput;
  canManage: boolean;
  /** Optional "now" override — lets stories produce stable "X ago" strings. */
  now?: Date;
  onRowClick: (id: string) => void;
  onTest: (id: string) => void;
  onRename: (id: string) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
}>;

/**
 * One integration rendered as a card in the list grid. Whole card is clickable
 * and navigates to the detail view; the overflow menu in the top-right stops
 * propagation so clicking "Test" does not also navigate.
 */
export function IntegrationCard(
  props: IntegrationCardProps,
): React.ReactElement {
  const { t } = useTranslation('integrations');
  const {
    integration,
    canManage,
    now,
    onRowClick,
    onTest,
    onRename,
    onRotate,
    onDelete,
  } = props;

  const lastTested =
    integration.testedAt === null
      ? t('list.lastTestedNever')
      : formatTimeAgo(integration.testedAt, now);

  return (
    <div
      role="button"
      tabIndex={0}
      data-test={`integration-card-${integration.slug}`}
      onClick={() => onRowClick(integration.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onRowClick(integration.id);
        }
      }}
      className="group border-border bg-card text-card-foreground hover:border-primary/60 focus-visible:ring-ring flex min-h-[12rem] cursor-pointer flex-col rounded-xl border p-5 shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between">
        <ProviderLogo provider={integration.provider} />
        <div
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <IntegrationRowMenu
            canManage={canManage}
            onTest={() => onTest(integration.id)}
            onRename={() => onRename(integration.id)}
            onRotate={() => onRotate(integration.id)}
            onDelete={() => onDelete(integration.id)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <h3 className="text-foreground truncate text-base font-semibold">
          {integration.name}
        </h3>
        {integration.testIdentity && (
          <p className="text-muted-foreground truncate font-mono text-xs">
            {integration.testIdentity}
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground font-mono text-xs">
            {integration.config.defaultRegion}
          </span>
          <span className="text-muted-foreground text-xs">{lastTested}</span>
        </div>
        <IntegrationStatusBadge status={integration.testStatus} />
      </div>
    </div>
  );
}
