import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@guepard/ui/alert';

export type CreditsBannerProps = {
  /** Active organization slug — used to build the billing top-up URL. */
  orgSlug: string;
};

/**
 * Shown in place of the agent body when the org has no credits. CTA links to
 * the org billing page in the same shell tab.
 */
export function CreditsBanner({ orgSlug }: Readonly<CreditsBannerProps>) {
  const { t } = useTranslation('chat');
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Alert variant="warning" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('credits.banner_title')}</AlertTitle>
        <AlertDescription>
          <p>{t('credits.banner_description')}</p>
          <a
            href={`/org/${encodeURIComponent(orgSlug)}/billing`}
            className="mt-2 inline-block text-sm font-medium underline underline-offset-4"
          >
            {t('credits.cta')}
          </a>
        </AlertDescription>
      </Alert>
    </div>
  );
}
