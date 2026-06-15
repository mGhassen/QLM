import { useState } from 'react';

import { useCsrfToken } from '@guepard/csrf/client';
import { Alert, AlertDescription, AlertTitle } from '@guepard/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@guepard/ui/alert-dialog';
import { Button } from '@guepard/ui/button';
import { If } from '@guepard/ui/if';
import { Trans } from '@guepard/ui/trans';

export const DeleteInvitationDialog: React.FC<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  invitationId: number;
}> = ({ isOpen, setIsOpen, invitationId }) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="team:deleteInvitation" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans i18nKey="team:deleteInvitationDialogDescription" />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <DeleteInvitationForm
          invitationId={invitationId}
          onSuccess={() => setIsOpen(false)}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
};

function DeleteInvitationForm({
  invitationId: _invitationId,
  onSuccess: _onSuccess,
}: {
  invitationId: number;
  onSuccess: () => void;
}) {
  useCsrfToken();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);

  const pending = isPending;

  return (
    <form
      data-test={'delete-invitation-form'}
      onSubmit={(e) => {
        e.preventDefault();

        // TODO: wire up server action integration
        // Original: fetcher.submit({ intent: 'delete-invitation', payload: { invitationId, csrfToken } }, { method: 'POST', encType: 'application/json' })
        setIsPending(true);
        setError(false);
      }}
    >
      <div className={'flex flex-col space-y-6'}>
        <p className={'text-muted-foreground text-sm'}>
          <Trans i18nKey={'common:modalConfirmationQuestion'} />
        </p>

        <If condition={error}>
          <RemoveInvitationErrorAlert />
        </If>

        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans i18nKey={'common:cancel'} />
          </AlertDialogCancel>

          <Button type={'submit'} variant={'destructive'} disabled={pending}>
            <Trans i18nKey={'organizations:deleteInvitation'} />
          </Button>
        </AlertDialogFooter>
      </div>
    </form>
  );
}

function RemoveInvitationErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <AlertTitle>
        <Trans i18nKey={'organizations:deleteInvitationErrorTitle'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'organizations:deleteInvitationErrorMessage'} />
      </AlertDescription>
    </Alert>
  );
}
