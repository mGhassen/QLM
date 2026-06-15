import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@guepard/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@guepard/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@guepard/ui/form';
import { Input } from '@guepard/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatCurrency } from '@guepard/shared/utils';
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { stripePromise } from '../stripe-browser';

const buyCreditsSchema = z.object({
  amount: z.number().min(5).max(100),
});

type BuyCreditsFormValues = z.infer<typeof buyCreditsSchema>;

type BuyCreditsProps = {
  onPurchase?: (values: BuyCreditsFormValues) => void | Promise<void>;
  currencyCode?: string;
  locale?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentIntentClientSecret?: string;
  paymentIntentAmount?: number; // Amount used to create the payment intent (for readonly display)
  onCreateCheckout?: (amount: number) => void | Promise<void>;
};

// Form component used when payment intent is ready (wrapped in Elements)
function BuyCreditsFormWithStripe({
  onPurchase,
  currencyCode = 'USD',
  locale = 'en-US',
  minAmount = 10,
  maxAmount = 100,
  paymentIntentClientSecret,
  paymentIntentAmount,
  onCreateCheckout,
  onClose,
}: BuyCreditsProps & { onClose: () => void }) {
  const { t } = useTranslation('organizations');
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const form = useForm<BuyCreditsFormValues>({
    resolver: zodResolver(buyCreditsSchema),
    defaultValues: {
      amount: paymentIntentAmount || minAmount,
    },
  });

  const amount = form.watch('amount');
  const hasCreatedPaymentIntent = useRef(false);
  const onCreateCheckoutRef = useRef(onCreateCheckout);

  // Keep ref in sync with prop
  useEffect(() => {
    onCreateCheckoutRef.current = onCreateCheckout;
  }, [onCreateCheckout]);

  // Update form value when paymentIntentAmount becomes available
  useEffect(() => {
    if (paymentIntentAmount !== undefined && paymentIntentAmount !== amount) {
      form.reset({ amount: paymentIntentAmount });
    }
  }, [paymentIntentAmount, amount, form]);

  // Reset flag when paymentIntentClientSecret changes (meaning we got a new one)
  useEffect(() => {
    if (paymentIntentClientSecret) {
      hasCreatedPaymentIntent.current = true;
    }
  }, [paymentIntentClientSecret]);

  const subtotal = amount || 0;
  const estimatedTaxes = 0; // This would come from your billing system
  const total = subtotal + estimatedTaxes;

  const handleSubmit = async (values: BuyCreditsFormValues) => {
    if (!stripe || !elements || !paymentIntentClientSecret) {
      return;
    }

    setIsProcessing(true);
    try {
      // Payment intent was created with the correct amount when user clicked "Continue to payment"
      // No need to update it here

      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw submitError;
      }

      // Confirm the payment intent - this will both charge the payment method
      // and save it for future use (due to setup_future_usage)
      const result = await stripe.confirmPayment({
        elements,
        clientSecret: paymentIntentClientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
      });

      if (result.error) {
        throw result.error;
      }

      const paymentIntent =
        'paymentIntent' in result
          ? (result.paymentIntent as { status: string } | null)
          : null;
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        await onPurchase?.(values);
        onClose();
        form.reset();
      }
    } catch (error) {
      console.error('Failed to purchase credits:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('billing.buyCredits.creditsLabel')}</FormLabel>
              <FormDescription>
                {t('billing.buyCredits.enterAmountBetween', {
                  min: formatCurrency({
                    currencyCode,
                    locale,
                    value: minAmount,
                  }),
                  max: formatCurrency({
                    currencyCode,
                    locale,
                    value: maxAmount,
                  }),
                })}
              </FormDescription>
              <FormControl>
                <div className="relative">
                  <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                    $
                  </span>
                  <Input
                    type="number"
                    className="pl-7"
                    min={minAmount}
                    max={maxAmount}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    disabled={isProcessing || !!paymentIntentClientSecret}
                    readOnly={!!paymentIntentClientSecret}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        {paymentIntentClientSecret && elements ? (
          <div className="rounded-lg border p-4">
            <PaymentElement />
          </div>
        ) : paymentIntentClientSecret ? (
          <div className="text-muted-foreground py-4 text-center">
            {t('billing.buyCredits.loadingPaymentMethod')}
          </div>
        ) : null}

        <div className="space-y-2 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('billing.buyCredits.subtotal')}
            </span>
            <span>
              {formatCurrency({ currencyCode, locale, value: subtotal })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('billing.buyCredits.estimatedTaxes')}
            </span>
            <span>
              {formatCurrency({ currencyCode, locale, value: estimatedTaxes })}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>{t('billing.buyCredits.total')}</span>
            <span>
              {formatCurrency({ currencyCode, locale, value: total })}
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            disabled={
              isProcessing ||
              (paymentIntentClientSecret && (!stripe || !elements)) ||
              !amount ||
              amount < minAmount ||
              amount > maxAmount
            }
          >
            {isProcessing
              ? t('billing.buyCredits.processing')
              : !paymentIntentClientSecret
                ? t('billing.buyCredits.continueToPayment')
                : t('billing.buyCredits.buyAmountOfCredits', {
                    amount: formatCurrency({
                      currencyCode,
                      locale,
                      value: amount || 0,
                    }),
                  })}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            {t('billing.buyCredits.termsByClicking', {
              action: paymentIntentClientSecret
                ? t('billing.buyCredits.triggerButton')
                : t('billing.buyCredits.continueToPayment'),
            })}{' '}
            <a
              href="https://agent.qwery.run/docs/credit-terms"
              className="text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {t('billing.buyCredits.creditTerms')}
            </a>
            . {t('billing.buyCredits.paymentMethodSaved')}
          </p>
        </DialogFooter>
      </form>
    </Form>
  );
}

// Form component used when payment intent is not ready yet (no Elements wrapper)
function BuyCreditsFormWithoutStripe({
  onPurchase: _onPurchase,
  currencyCode = 'USD',
  locale = 'en-US',
  minAmount = 10,
  maxAmount = 100,
  onCreateCheckout,
  onClose: _onClose,
}: Omit<BuyCreditsProps, 'paymentIntentClientSecret'> & {
  onClose: () => void;
}) {
  const { t } = useTranslation('organizations');
  const [isProcessing, _setIsProcessing] = useState(false);
  const form = useForm<BuyCreditsFormValues>({
    resolver: zodResolver(buyCreditsSchema),
    defaultValues: {
      amount: 10,
    },
  });

  const amount = form.watch('amount');
  const hasCreatedPaymentIntent = useRef(false);
  const onCreateCheckoutRef = useRef(onCreateCheckout);

  // Keep ref in sync with prop
  useEffect(() => {
    onCreateCheckoutRef.current = onCreateCheckout;
  }, [onCreateCheckout]);

  const subtotal = amount || 0;
  const estimatedTaxes = 0;
  const total = subtotal + estimatedTaxes;

  const handleSubmit = async (values: BuyCreditsFormValues) => {
    // Create payment intent first
    if (onCreateCheckoutRef.current && !hasCreatedPaymentIntent.current) {
      hasCreatedPaymentIntent.current = true;
      onCreateCheckoutRef.current(values.amount);
      return;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('billing.buyCredits.creditsLabel')}</FormLabel>
              <FormDescription>
                {t('billing.buyCredits.enterAmountBetween', {
                  min: formatCurrency({
                    currencyCode,
                    locale,
                    value: minAmount,
                  }),
                  max: formatCurrency({
                    currencyCode,
                    locale,
                    value: maxAmount,
                  }),
                })}
              </FormDescription>
              <FormControl>
                <div className="relative">
                  <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                    $
                  </span>
                  <Input
                    type="number"
                    className="pl-7"
                    min={minAmount}
                    max={maxAmount}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    disabled={isProcessing}
                    data-test="billing-buy-credits-amount-input"
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-2 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('billing.buyCredits.subtotal')}
            </span>
            <span>
              {formatCurrency({ currencyCode, locale, value: subtotal })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('billing.buyCredits.estimatedTaxes')}
            </span>
            <span>
              {formatCurrency({ currencyCode, locale, value: estimatedTaxes })}
            </span>
          </div>
          <div
            className="flex justify-between border-t pt-2 font-semibold"
            data-test="billing-buy-credits-total-row"
          >
            <span>{t('billing.buyCredits.total')}</span>
            <span data-test="billing-buy-credits-total-value">
              {formatCurrency({ currencyCode, locale, value: total })}
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            disabled={
              isProcessing ||
              !amount ||
              amount < minAmount ||
              amount > maxAmount
            }
            data-test="billing-buy-credits-continue-button"
          >
            {isProcessing
              ? t('billing.buyCredits.processing')
              : t('billing.buyCredits.continueToPayment')}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            {t('billing.buyCredits.termsByClicking', {
              action: t('billing.buyCredits.continueToPayment'),
            })}{' '}
            <a
              href="https://agent.qwery.run/docs/credit-terms"
              className="text-primary hover:underline"
            >
              {t('billing.buyCredits.creditTerms')}
            </a>
            . {t('billing.buyCredits.paymentMethodSaved')}
          </p>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function BuyCredits({
  onPurchase,
  currencyCode = 'USD',
  locale = 'en-US',
  minAmount = 10,
  maxAmount = 100,
  paymentIntentClientSecret,
  paymentIntentAmount: externalPaymentIntentAmount,
  onCreateCheckout,
}: BuyCreditsProps) {
  const { t } = useTranslation('organizations');
  const [open, setOpen] = useState(false);
  const [storedAmount, setStoredAmount] = useState<number | undefined>();
  const hasInitiatedCheckout = useRef(false);
  const onCreateCheckoutRef = useRef(onCreateCheckout);

  // Keep ref in sync with prop
  useEffect(() => {
    onCreateCheckoutRef.current = onCreateCheckout;
  }, [onCreateCheckout]);

  // Handle dialog close - reset state
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      hasInitiatedCheckout.current = false;
      setStoredAmount(undefined);
    }
  }, []);

  // Wrapper to track amount when creating checkout
  const handleCreateCheckout = useCallback(
    (amount: number) => {
      setStoredAmount(amount);
      onCreateCheckout?.(amount);
    },
    [onCreateCheckout],
  );

  // Use stored amount or external prop, prioritizing stored amount
  const paymentIntentAmount = storedAmount ?? externalPaymentIntentAmount;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" data-test="billing-buy-credits-trigger">
          {t('billing.buyCredits.triggerButton')}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[80vh] max-w-lg overflow-y-auto"
        data-test="billing-buy-credits-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('billing.buyCredits.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('billing.buyCredits.dialogDescription')}{' '}
            <a
              href="https://agent.qwery.run/docs/pricing"
              className="text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {t('billing.buyCredits.learnMore')}
            </a>
          </DialogDescription>
        </DialogHeader>

        {stripePromise ? (
          paymentIntentClientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: paymentIntentClientSecret }}
            >
              <BuyCreditsFormWithStripe
                onPurchase={onPurchase}
                currencyCode={currencyCode}
                locale={locale}
                minAmount={minAmount}
                maxAmount={maxAmount}
                paymentIntentClientSecret={paymentIntentClientSecret}
                paymentIntentAmount={paymentIntentAmount}
                onCreateCheckout={onCreateCheckout}
                onClose={() => setOpen(false)}
              />
            </Elements>
          ) : (
            <BuyCreditsFormWithoutStripe
              onPurchase={onPurchase}
              currencyCode={currencyCode}
              locale={locale}
              minAmount={minAmount}
              maxAmount={maxAmount}
              onCreateCheckout={handleCreateCheckout}
              onClose={() => setOpen(false)}
            />
          )
        ) : (
          <div className="text-muted-foreground py-8 text-center text-sm">
            {t('billing.buyCredits.stripeNotConfigured')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
