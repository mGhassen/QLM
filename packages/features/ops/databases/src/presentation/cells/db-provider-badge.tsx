import { DbProviderIcon } from '@guepard/ui/db-provider-icon';
import { cn } from '@guepard/ui/utils';
import { PROVIDER_LABELS, PROVIDER_STYLES } from '../../application/constants';

type DbProviderBadgeProps = Readonly<{
  provider: string;
  className?: string;
}>;

export function DbProviderBadge({ provider, className }: DbProviderBadgeProps) {
  const style = PROVIDER_STYLES[provider];
  const label = PROVIDER_LABELS[provider] ?? provider;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-none border-2 px-2 h-5 max-w-full overflow-hidden',
        'text-[10px] font-black uppercase tracking-widest leading-none',
        style?.bg ?? 'bg-muted/50',
        style?.text ?? 'text-muted-foreground',
        style?.border ?? 'border-border',
        className,
      )}
    >
      <span className="shrink-0 inline-flex"><DbProviderIcon provider={provider} size={12} /></span>
      <span className="truncate min-w-0">{label}</span>
    </span>
  );
}
