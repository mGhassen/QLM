import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@qlm/ui/card';
import { cn } from '@qlm/ui/utils';
import { formatCurrency } from '@qlm/shared/utils';

type RemainingBalanceProps = {
  balance: number;
  currencyCode?: string;
  locale?: string;
  className?: string;
};

export function RemainingBalance({
  balance,
  currencyCode = 'USD',
  locale = 'en-US',
  className,
}: RemainingBalanceProps) {
  const { t } = useTranslation('organizations');
  const formattedBalance = formatCurrency({
    currencyCode,
    locale,
    value: balance / 100,
  });

  return (
    <Card
      className={cn('bg-card border-border rounded-lg shadow-none', className)}
      data-test="billing-remaining-balance"
    >
      <CardContent className="p-6">
        <div className="flex flex-col gap-1">
          <div
            className="text-4xl font-bold tracking-tight"
            data-test="billing-balance-value"
          >
            {formattedBalance}
          </div>
          <div className="text-muted-foreground text-sm">
            {t('billing.remainingBalance', { balance })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
