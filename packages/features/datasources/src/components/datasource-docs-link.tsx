import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@guepard/ui/utils';

export interface DatasourceDocsLinkProps {
  docsUrl: string | null | undefined;
  className?: string;
  iconOnly?: boolean;
}

/**
 * Link to the external documentation for a datasource provider.
 * Renders nothing when no `docsUrl` is provided.
 */
export function DatasourceDocsLink({
  docsUrl,
  className,
  iconOnly = false,
}: Readonly<DatasourceDocsLinkProps>) {
  const { t } = useTranslation('datasources');

  if (!docsUrl) return null;

  if (iconOnly) {
    return (
      <a
        href={docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'text-muted-foreground hover:text-foreground flex shrink-0 items-center justify-center rounded-md p-1.5 transition-colors',
          className,
        )}
        aria-label={t('docsLink')}
      >
        <ExternalLink className="size-4" aria-hidden />
      </a>
    );
  }

  return (
    <div
      className={cn(
        'text-muted-foreground flex items-center gap-1.5 text-xs',
        className,
      )}
    >
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
      <a
        href={docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground underline underline-offset-2 transition-colors"
      >
        {t('docsLink')}
      </a>
    </div>
  );
}
