import { useCallback, useState } from 'react';

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
import { Spinner } from '@qlm/ui/spinner';
import { Trans } from '@qlm/ui/trans';

export const RemoveMemberDialog: React.FC<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  organizationId: string;
  userId: string;
  memberName?: string | null;
  memberEmail?: string;
  organizationSlug?: string;
  onRemove?: (params: {
    organizationSlug: string;
    userId: string;
  }) => Promise<{ success: boolean } | void>;
}> = ({
  isOpen,
  setIsOpen,
  organizationId: _organizationId,
  userId,
  memberName,
  memberEmail,
  organizationSlug,
  onRemove,
}) => {
  useCsrfToken();
  const [isPending, setIsPending] = useState(false);

  const [apiPending, setApiPending] = useState(false);
  const [apiError, setApiError] = useState(false);
  const pending = onRemove ? apiPending : isPending;
  const error = onRemove ? apiError : false;

  const onMemberRemoved = useCallback(async () => {
    if (onRemove && organizationSlug) {
      setApiError(false);
      setApiPending(true);
      try {
        const result = await onRemove({ organizationSlug, userId });
        if (!result || result.success !== false) {
          setIsOpen(false);
        } else {
          setApiError(true);
        }
      } catch {
        setApiError(true);
      } finally {
        setApiPending(false);
      }
      return;
    }
    // TODO: wire up server action integration
    // Original: fetcher.submit({ intent: 'remove-member', payload: { organizationId, userId, csrfToken } }, { method: 'POST', encType: 'application/json' })
    setIsPending(true);
  }, [userId, onRemove, organizationSlug, setIsOpen]);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="gap-6 rounded-xl sm:max-w-md">
        <AlertDialogHeader className="space-y-2">
          <AlertDialogTitle>
            <Trans i18nKey="organizations:removeMemberModalHeading" />
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans i18nKey={'organizations:removeMemberModalDescription'} />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <RemoveMemberForm
          onSubmit={onMemberRemoved}
          pending={pending}
          error={error}
          memberDisplay={
            memberName && memberEmail
              ? `${memberName} (${memberEmail})`
              : (memberName ?? memberEmail ?? undefined)
          }
        />
      </AlertDialogContent>
    </AlertDialog>
  );
};

function RemoveMemberForm({
  onSubmit,
  pending,
  error,
  memberDisplay,
}: {
  onSubmit: () => void;
  pending: boolean;
  error: boolean | undefined;
  memberDisplay?: string;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        {memberDisplay ? (
          <>
            <Trans
              i18nKey="organizations:removeMemberConfirmPrefix"
              defaults="Remove"
            />{' '}
            <strong className="text-foreground font-medium">
              {memberDisplay}
            </strong>{' '}
            <Trans
              i18nKey="organizations:removeMemberConfirmSuffix"
              defaults="from this organization? This cannot be undone."
            />
          </>
        ) : (
          <Trans i18nKey={'common:modalConfirmationQuestion'} />
        )}
      </p>

      <If condition={error}>
        <RemoveMemberErrorAlert />
      </If>

      <AlertDialogFooter className="flex justify-end gap-2 sm:gap-2">
        <AlertDialogCancel>
          <Trans i18nKey={'common:cancel'} />
        </AlertDialogCancel>
        <Button
          type="submit"
          data-test={'confirm-remove-member'}
          variant={'destructive'}
          disabled={pending}
          className="h-11 min-w-[100px] font-semibold"
        >
          <If condition={pending}>
            <Spinner className="mr-2 h-4 w-4" />
          </If>
          <Trans i18nKey={'organizations:removeMemberSubmitLabel'} />
        </Button>
      </AlertDialogFooter>
    </form>
  );
}

function RemoveMemberErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <AlertTitle>
        <Trans i18nKey={'organizations:removeMemberErrorHeading'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'organizations:removeMemberErrorMessage'} />
      </AlertDescription>
    </Alert>
  );
}
