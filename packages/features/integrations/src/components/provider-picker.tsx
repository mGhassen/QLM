import { Cloud, CloudCog, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { IntegrationProvider } from '@guepard/domain/entities';
import { cn } from '@guepard/ui/utils';

export type ProviderPickerProps = Readonly<{
  value: IntegrationProvider | null;
  onSelect: (provider: IntegrationProvider) => void;
}>;

export function ProviderPicker(props: ProviderPickerProps): React.ReactElement {
  const { t } = useTranslation('integrations');
  const { value, onSelect } = props;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-foreground text-lg font-semibold">
        {t('new.providerPicker.heading')}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProviderCard
          provider="aws"
          selected={value === 'aws'}
          icon={<Cloud className="h-8 w-8" aria-hidden />}
          label={t('new.providerPicker.awsLabel')}
          description={t('new.providerPicker.awsDescription')}
          onSelect={() => onSelect('aws')}
        />
        <ProviderCard
          provider="gcp"
          selected={value === 'gcp'}
          icon={<CloudCog className="h-8 w-8" aria-hidden />}
          label={t('new.providerPicker.gcpLabel')}
          description={t('new.providerPicker.gcpDescription')}
          onSelect={() => onSelect('gcp')}
        />
        <ComingSoonCard
          icon={<Sparkles className="h-8 w-8" aria-hidden />}
          label={t('new.providerPicker.comingSoonLabel')}
          description={t('new.providerPicker.comingSoonDescription')}
        />
      </div>
    </div>
  );
}

type ProviderCardProps = Readonly<{
  provider: IntegrationProvider;
  selected: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onSelect: () => void;
}>;

function ProviderCard(props: ProviderCardProps): React.ReactElement {
  const { provider, selected, icon, label, description, onSelect } = props;

  return (
    <button
      type="button"
      onClick={onSelect}
      data-test={`provider-card-${provider}`}
      className={cn(
        'border-border bg-background hover:border-primary/60 flex flex-col items-start gap-3 rounded-lg border p-6 text-left transition-colors',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        selected && 'border-primary ring-primary ring-2',
      )}
      aria-pressed={selected}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-md',
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-foreground text-base font-semibold">{label}</span>
        <span className="text-muted-foreground text-sm">{description}</span>
      </div>
    </button>
  );
}

type ComingSoonCardProps = Readonly<{
  icon: React.ReactNode;
  label: string;
  description: string;
}>;

/**
 * Disabled placeholder card that fills the third grid slot. Previews the
 * phase-5 rollout (Supabase / Neon / Azure) from RFC 0001 without wiring any
 * real flow. Not focusable, not clickable — aria-disabled for screen readers.
 */
function ComingSoonCard(props: ComingSoonCardProps): React.ReactElement {
  const { icon, label, description } = props;

  return (
    <div
      data-test="provider-card-coming-soon"
      aria-disabled="true"
      className="border-border bg-muted/20 flex cursor-not-allowed flex-col items-start gap-3 rounded-lg border border-dashed p-6 opacity-70"
    >
      <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-md">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-base font-semibold">
          {label}
        </span>
        <span className="text-muted-foreground text-sm">{description}</span>
      </div>
    </div>
  );
}
