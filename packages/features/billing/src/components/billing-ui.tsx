import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@guepard/ui/button';
import { RemainingBalance } from './remaining-balance';
import { BuyCredits } from './buy-credits';
import { InvoiceHistory, type Invoice } from './invoice-history';
import { CreditCardIcon, EditIcon } from 'lucide-react';
import { Label } from '@guepard/ui/label';

type PaymentMethod = {
  id: string;
  type: 'card' | 'link' | 'bank_account';
  displayName: string;
  last4?: string;
};

type BillingUIProps = {
  orgSlug: string;
  balance?: number;
  currencyCode?: string;
  locale?: string;
  paymentMethod?: PaymentMethod;
  invoices?: Invoice[];
  checkoutToken?: string;
  onCreateCheckout?: (amount: number) => void | Promise<void>;
  onBuyCredits?: (values: { amount: number }) => void | Promise<void>;
  onEditPaymentMethod?: () => void | Promise<void>;
  onDownloadInvoice?: (invoiceId: string) => void | Promise<void>;
  onViewInvoice?: (invoiceId: string) => void | Promise<void>;
};

export function BillingUI({
  orgSlug: _orgSlug,
  balance = 0,
  currencyCode = 'USD',
  locale = 'en-US',
  paymentMethod,
  invoices = [],
  checkoutToken: externalCheckoutToken,
  onCreateCheckout,
  onBuyCredits,
  onEditPaymentMethod,
  onDownloadInvoice,
  onViewInvoice,
}: BillingUIProps) {
  const { t } = useTranslation('organizations');
  const [_isEditingPayment, setIsEditingPayment] = useState(false);
  const [_isCheckoutOpen, _setIsCheckoutOpen] = useState(false);

  const handleEditPayment = async () => {
    try {
      await onEditPaymentMethod?.();
      setIsEditingPayment(false);
    } catch (error) {
      console.error('Failed to edit payment method:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Credit Balance Section */}
      <div className="space-y-4" data-test="billing-credit-balance-section">
        <div>
          <h2
            className="text-2xl font-bold tracking-tight"
            data-test="billing-credit-balance-title"
          >
            {t('billing.creditBalanceTitle')}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('billing.creditBalanceDescription')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <RemainingBalance
            balance={balance}
            currencyCode={currencyCode}
            locale={locale}
          />

          <div className="space-y-4">
            {paymentMethod && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">
                  {t('billing.chargedTo')}
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={handleEditPayment}
                  >
                    {paymentMethod.type === 'link' && (
                      <CreditCardIcon className="h-4 w-4" />
                    )}
                    <span>{paymentMethod.displayName}</span>
                    <EditIcon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <BuyCredits
              onPurchase={onBuyCredits}
              currencyCode={currencyCode}
              locale={locale}
              paymentIntentClientSecret={externalCheckoutToken}
              onCreateCheckout={onCreateCheckout}
            />
          </div>
        </div>
      </div>

      {/* Invoice History Section */}
      <InvoiceHistory
        invoices={invoices}
        currencyCode={currencyCode}
        locale={locale}
        onDownload={onDownloadInvoice}
        onView={onViewInvoice}
      />
    </div>
  );
}

export default BillingUI;
