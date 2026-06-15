'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { useCsrfToken } from '@guepard/csrf/client';
import { VerifyOtpForm } from '@guepard/otp/components';
import { useUser } from '@guepard/supabase/hooks/use-user';
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
import { Form } from '@guepard/ui/form';
import { If } from '@guepard/ui/if';
import { Trans } from '@guepard/ui/trans';

import { TransferOwnershipConfirmationSchema } from '../../schema';

export const TransferOwnershipDialog: React.FC<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  organizationId: string;
  userId: string;
  targetDisplayName: string;
}> = ({ isOpen, setIsOpen, targetDisplayName, organizationId, userId }) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="team:transferOwnership" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans i18nKey="team:transferOwnershipDescription" />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <TransferOrganizationOwnershipForm
          organizationId={organizationId}
          userId={userId}
          targetDisplayName={targetDisplayName}
          onSuccess={() => setIsOpen(false)}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
};

function TransferOrganizationOwnershipForm({
  organizationId,
  userId,
  targetDisplayName,
  onSuccess: _onSuccess,
}: {
  userId: string;
  organizationId: string;
  targetDisplayName: string;
  onSuccess: () => void;
}) {
  const user = useUser();
  const csrfToken = useCsrfToken();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);

  const form = useForm({
    resolver: zodResolver(TransferOwnershipConfirmationSchema),
    defaultValues: {
      otp: '',
      organizationId,
      userId,
      csrfToken,
    },
  });

  const pending = isPending;
  const { otp } = useWatch({ control: form.control });

  if (!otp) {
    return (
      <VerifyOtpForm
        purpose={`transfer-ownership-${organizationId}`}
        email={user.data?.email as string}
        onSuccess={(otp) => form.setValue('otp', otp, { shouldValidate: true })}
        CancelButton={
          <AlertDialogCancel>
            <Trans i18nKey={'common:cancel'} />
          </AlertDialogCancel>
        }
      />
    );
  }

  return (
    <Form {...form}>
      <form
        className={'flex flex-col space-y-4 text-sm'}
        onSubmit={form.handleSubmit((_payload) => {
          // TODO: wire up server action integration
          // Original: fetcher.submit({ intent: 'transfer-ownership', payload }, { method: 'POST', encType: 'application/json' })
          setIsPending(true);
          setError(false);
        })}
      >
        <If condition={error}>
          <TransferOwnershipErrorAlert />
        </If>

        <p>
          <Trans
            i18nKey={'organizations:transferOwnershipDisclaimer'}
            values={{
              member: targetDisplayName,
            }}
            components={{ b: <b /> }}
          />
        </p>

        <div>
          <p className={'text-muted-foreground'}>
            <Trans i18nKey={'common:modalConfirmationQuestion'} />
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans i18nKey={'common:cancel'} />
          </AlertDialogCancel>

          <Button
            type={'submit'}
            data-test={'confirm-transfer-ownership-button'}
            variant={'destructive'}
            disabled={pending}
          >
            <If
              condition={pending}
              fallback={<Trans i18nKey={'organizations:transferOwnership'} />}
            >
              <Trans i18nKey={'organizations:transferringOwnership'} />
            </If>
          </Button>
        </AlertDialogFooter>
      </form>
    </Form>
  );
}

function TransferOwnershipErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <AlertTitle>
        <Trans i18nKey={'organizations:transferTeamErrorHeading'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'organizations:transferTeamErrorMessage'} />
      </AlertDescription>
    </Alert>
  );
}
