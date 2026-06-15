import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { TestResult } from '@qlm/domain/usecases';
import { Alert, AlertDescription, AlertTitle } from '@qlm/ui/alert';

export type TestResultBannerProps = Readonly<{
  result: TestResult;
}>;

/**
 * Inline alert shown under a credentials form after the user clicks
 * "Test connection". Success and every error-code variant are handled here
 * so forms don't have to branch on the taxonomy.
 */
export function TestResultBanner(
  props: TestResultBannerProps,
): React.ReactElement {
  const { t } = useTranslation('integrations');
  const { result } = props;

  if (result.ok) {
    return (
      <Alert className="border-emerald-500/40 bg-emerald-500/10">
        <CheckCircle2
          className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        <AlertTitle className="text-emerald-700 dark:text-emerald-300">
          {t('test.status.success')}
        </AlertTitle>
        <AlertDescription className="text-emerald-700/80 dark:text-emerald-300/80">
          {t('test.successBanner', { identity: result.identity ?? '' })}
        </AlertDescription>
      </Alert>
    );
  }

  const code = result.errorCode ?? 'unknown';
  const message =
    code === 'unknown'
      ? t('test.error.unknown', { message: result.errorMessage ?? '' })
      : t(`test.error.${code}`);

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" aria-hidden />
      <AlertTitle>{t('test.status.failed')}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
