import { useCallback, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useCsrfToken } from '@guepard/csrf/client';
import { Alert, AlertDescription, AlertTitle } from '@guepard/ui/alert';
import { Button } from '@guepard/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@guepard/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@guepard/ui/form';
import { If } from '@guepard/ui/if';
import { Trans } from '@guepard/ui/trans';

import { RoleSchema } from '../../schema';
import { MembershipRoleSelector } from '../members/membership-role-selector';
import { RolesDataProvider } from '../members/roles-data-provider';

type Role = string;

export const UpdateInvitationDialog: React.FC<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  invitationId: number;
  userRole: Role;
  userRoleHierarchy: number;
}> = ({
  isOpen,
  setIsOpen,
  invitationId: _invitationId,
  userRole,
  userRoleHierarchy,
}) => {
  useCsrfToken();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);

  const pending = isPending;

  const onSubmit = useCallback((_params: { role: Role }) => {
    setIsPending(true);
    setError(false);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey={'organizations:updateMemberRoleModalHeading'} />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey={'organizations:updateMemberRoleModalDescription'} />
          </DialogDescription>
        </DialogHeader>

        <UpdateInvitationForm
          onSubmit={onSubmit}
          pending={pending}
          error={error}
          userRole={userRole}
          userRoleHierarchy={userRoleHierarchy}
        />
      </DialogContent>
    </Dialog>
  );
};

function UpdateInvitationForm({
  onSubmit,
  pending,
  error,
  userRole,
  userRoleHierarchy,
}: React.PropsWithChildren<{
  onSubmit: (data: { role: Role }) => void;
  pending: boolean;
  error: boolean | undefined;
  userRole: Role;
  userRoleHierarchy: number;
}>) {
  const { t } = useTranslation('teams');

  const form = useForm({
    resolver: zodResolver(
      RoleSchema.refine(
        (data) => {
          return data.role !== userRole;
        },
        {
          message: t('roleMustBeDifferent'),
          path: ['role'],
        },
      ),
    ),
    reValidateMode: 'onChange',
    mode: 'onChange',
    defaultValues: {
      role: userRole,
    },
  });

  return (
    <Form {...form}>
      <form
        data-test={'update-invitation-form'}
        onSubmit={form.handleSubmit(onSubmit)}
        className={'flex flex-col space-y-6'}
      >
        <If condition={error}>
          <UpdateRoleErrorAlert />
        </If>

        <FormField
          name={'role'}
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey={'organizations:roleLabel'} />
                </FormLabel>

                <FormControl>
                  <RolesDataProvider maxRoleHierarchy={userRoleHierarchy}>
                    {(roles) => (
                      <MembershipRoleSelector
                        roles={roles}
                        currentUserRole={userRole}
                        value={field.value}
                        onChange={(newRole) =>
                          form.setValue(field.name, newRole)
                        }
                      />
                    )}
                  </RolesDataProvider>
                </FormControl>

                <FormDescription>
                  <Trans i18nKey={'organizations:updateRoleDescription'} />
                </FormDescription>

                <FormMessage />
              </FormItem>
            );
          }}
        />

        <Button type={'submit'} disabled={pending}>
          <Trans i18nKey={'organizations:updateRoleSubmitLabel'} />
        </Button>
      </form>
    </Form>
  );
}

function UpdateRoleErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <AlertTitle>
        <Trans i18nKey={'organizations:updateRoleErrorHeading'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'organizations:updateRoleErrorMessage'} />
      </AlertDescription>
    </Alert>
  );
}
