import { useState } from 'react';

import { useCsrfToken } from '@qlm/csrf/client';
import { Alert, AlertDescription, AlertTitle } from '@qlm/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@qlm/ui/alert-dialog';
import { Button } from '@qlm/ui/button';
import { If } from '@qlm/ui/if';
import { Trans } from '@qlm/ui/trans';

export const RenewInvitationDialog: React.FC<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  invitationId: number;
  email: string;
}> = ({ isOpen, setIsOpen, invitationId, email }) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="team:renewInvitation" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans
              i18nKey="team:renewInvitationDialogDescription"
              values={{ email }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <RenewInvitationForm
          onSuccess={() => setIsOpen(false)}
          invitationId={invitationId}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
};

function RenewInvitationForm({
  invitationId: _invitationId,
  onSuccess: _onSuccess,
}: {
  invitationId: number;
  onSuccess: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);

  useCsrfToken();
  const pending = isPending;

  const inInvitationRenewed = () => {
    // TODO: wire up server action integration
    // Original: fetcher.submit({ intent: 'renew-invitation', payload: { invitationId, csrfToken } }, { method: 'POST', encType: 'application/json' })
    setIsPending(true);
    setError(false);
  };

  return (
    <form onSubmit={inInvitationRenewed}>
      <div className={'flex flex-col space-y-6'}>
        <p className={'text-muted-foreground text-sm'}>
          <Trans i18nKey={'common:modalConfirmationQuestion'} />
        </p>

        <If condition={error}>
          <RenewInvitationErrorAlert />
        </If>

        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans i18nKey={'common:cancel'} />
          </AlertDialogCancel>

          <Button data-test={'confirm-renew-invitation'} disabled={pending}>
            <Trans i18nKey={'organizations:renewInvitation'} />
          </Button>
        </AlertDialogFooter>
      </div>
    </form>
  );
}

function RenewInvitationErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <AlertTitle>
        <Trans i18nKey={'organizations:renewInvitationErrorTitle'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'organizations:renewInvitationErrorDescription'} />
      </AlertDescription>
    </Alert>
  );
}
