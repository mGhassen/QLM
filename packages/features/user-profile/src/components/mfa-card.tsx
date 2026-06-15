import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@guepard/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@guepard/ui/card';

import { MultiFactorAuthFactorsList } from './multi-factor-auth-factors-list';

export type MfaFactorRow = Readonly<{
  id: string;
  friendlyName: string;
}>;

export type MfaCardProps = Readonly<{
  factors: ReadonlyArray<MfaFactorRow>;
  isLoading?: boolean;
  isPending?: boolean;
  unenrollError?: string | null;
  onSetup?: () => void;
  onUnenroll?: (input: {
    factorId: string;
    currentPassword: string;
  }) => Promise<void>;
  onClearUnenrollError?: () => void;
}>;

export function MfaCard({
  factors,
  isLoading = false,
  isPending = false,
  unenrollError = null,
  onSetup,
  onUnenroll,
  onClearUnenrollError,
}: MfaCardProps) {
  const { t } = useTranslation('user-profile');
  const setupDisabled = isLoading || isPending || onSetup === undefined;
  const hasFactors = factors.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('mfa.title')}</CardTitle>
        <CardDescription>{t('mfa.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4" data-test="mfa-card">
        {hasFactors ? (
          <div className="space-y-2">
            <p
              data-test="mfa-factors-heading"
              className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
            >
              {t('mfa.factorsHeading')}
            </p>
            {onUnenroll ? (
              <MultiFactorAuthFactorsList
                factors={factors}
                isPending={isPending}
                unenrollError={unenrollError}
                onUnenroll={onUnenroll}
                onClearError={onClearUnenrollError}
              />
            ) : (
              <ul className="space-y-1">
                {factors.map((factor) => (
                  <li
                    key={factor.id}
                    className="bg-muted/40 rounded-md px-3 py-2 text-sm"
                  >
                    {factor.friendlyName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div
            data-test="mfa-empty-callout"
            className="bg-muted/40 flex items-start gap-3 rounded-md px-3 py-3"
          >
            <ShieldCheck
              className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
              aria-hidden
            />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {t('mfa.emptyCalloutTitle')}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('mfa.emptyCalloutDescription')}
              </p>
            </div>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={setupDisabled}
          onClick={onSetup}
          data-test="mfa-setup-button"
        >
          {t('mfa.setupButton')}
        </Button>
      </CardContent>
    </Card>
  );
}
