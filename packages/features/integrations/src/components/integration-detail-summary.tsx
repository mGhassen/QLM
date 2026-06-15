import { useTranslation } from 'react-i18next';

import type { IntegrationConnectionOutput } from '@guepard/domain/usecases';

import { formatTimeAgo } from '../lib/format-time-ago';
import { IntegrationStatusBadge } from './integration-status-badge';

export type IntegrationDetailSummaryProps = Readonly<{
  integration: IntegrationConnectionOutput;
  /**
   * Display name of the user who created the integration. Resolved by the
   * caller (the app plugin in step 12) because `integration.createdBy` is a
   * UUID FK and the feature package does not access the users table.
   */
  createdByName?: string | null;
  /** Optional "now" override — lets stories produce stable "X ago" strings. */
  now?: Date;
}>;

export function IntegrationDetailSummary(
  props: IntegrationDetailSummaryProps,
): React.ReactElement {
  const { t } = useTranslation('integrations');
  const { integration, createdByName, now } = props;

  const lastTested =
    integration.testedAt === null
      ? t('list.lastTestedNever')
      : formatTimeAgo(integration.testedAt, now);
  const providerLabel = t(`provider.${integration.provider}`);
  const createdAt = formatTimeAgo(integration.createdAt, now);

  return (
    <dl className="border-border bg-background grid grid-cols-1 gap-y-4 rounded-lg border p-6 md:grid-cols-2 md:gap-x-8">
      <SummaryRow label={t('detail.providerLabel')} value={providerLabel} />
      <SummaryRow
        label={t('detail.accountLabel')}
        value={integration.testIdentity ?? '—'}
        mono
      />
      <SummaryRow
        label={t('detail.defaultRegionLabel')}
        value={integration.config.defaultRegion}
        mono
      />
      <SummaryRow
        label={t('detail.statusLabel')}
        value={<IntegrationStatusBadge status={integration.testStatus} />}
      />
      {integration.testStatus === 'failed' && integration.testError && (
        <div className="md:col-span-2">
          <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t('test.status.failed')}
          </dt>
          <dd className="text-destructive mt-1 text-sm">
            {integration.testError}
          </dd>
        </div>
      )}
      <SummaryRow
        label={t('detail.createdByLabel')}
        value={`${createdByName ?? '—'} · ${createdAt}`}
      />
      <SummaryRow label={t('list.columns.lastTested')} value={lastTested} />
    </dl>
  );
}

type SummaryRowProps = Readonly<{
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}>;

function SummaryRow(props: SummaryRowProps): React.ReactElement {
  const { label, value, mono } = props;
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd
        className={`text-foreground mt-1 text-sm ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
