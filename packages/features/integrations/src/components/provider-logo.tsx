import { Cloud, CloudCog } from 'lucide-react';

import type { IntegrationProvider } from '@guepard/domain/entities';
import { cn } from '@guepard/ui/utils';

export type ProviderLogoProps = Readonly<{
  provider: IntegrationProvider;
  className?: string;
}>;

/**
 * Minimal provider mark used in list rows and detail headers.
 *
 * Phase 1 uses lucide icons; step 12 or later can swap in real brand SVGs.
 * Kept as a separate component so swaps are one file.
 */
export function ProviderLogo(props: ProviderLogoProps): React.ReactElement {
  const { provider, className } = props;
  const Icon = provider === 'aws' ? Cloud : CloudCog;
  const colour =
    provider === 'aws'
      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400';

  return (
    <span
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md',
        colour,
        className,
      )}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
