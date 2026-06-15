import { useState } from 'react';
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js';
import { Dialog, DialogContent } from '@qlm/ui/dialog';

import { stripePromise } from '../stripe-browser';

function EmbeddedCheckoutPopup({
  onClose,
  children,
}: React.PropsWithChildren<{
  onClose?: () => void;
}>) {
  const [open, setOpen] = useState(true);
  const className = `bg-white p-4 max-h-[98vh] overflow-y-auto shadow-transparent border`;

  return (
    <Dialog
      defaultOpen
      open={open}
      onOpenChange={(open) => {
        if (!open && onClose) {
          onClose();
        }

        setOpen(open);
      }}
    >
      <DialogContent
        className={className}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div>{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function StripeCheckout({
  checkoutToken,
  onClose,
}: React.PropsWithChildren<{
  checkoutToken: string;
  onClose?: () => void;
}>) {
  if (!stripePromise) {
    return (
      <EmbeddedCheckoutPopup key={checkoutToken} onClose={onClose}>
        <p className="text-muted-foreground p-4 text-center text-sm">
          Payments are unavailable: set{' '}
          <code className="text-foreground">VITE_STRIPE_PUBLISHABLE_KEY</code>{' '}
          to your Stripe publishable key (starts with pk_).
        </p>
      </EmbeddedCheckoutPopup>
    );
  }

  return (
    <EmbeddedCheckoutPopup key={checkoutToken} onClose={onClose}>
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ clientSecret: checkoutToken }}
      >
        <EmbeddedCheckout className={'EmbeddedCheckoutClassName'} />
      </EmbeddedCheckoutProvider>
    </EmbeddedCheckoutPopup>
  );
}
