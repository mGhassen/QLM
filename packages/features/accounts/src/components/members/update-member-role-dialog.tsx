import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useCsrfToken } from '@guepard/csrf/client';
import { Alert, AlertDescription, AlertTitle } from '@guepard/ui/alert';
import { Button } from '@guepard/ui/button';
import { Spinner } from '@guepard/ui/spinner';
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
import { MembershipRoleSelector } from './membership-role-selector';
import { RolesDataProvider } from './roles-data-provider';

type Role = string;

export const UpdateMemberRoleDialog: React.FC<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userId: string;
  organizationId: string;
  userRole: Role;
  userRoleHierarchy: number;
  organizationSlug?: string;
  onUpdateRole?: (params: {
    organizationSlug: string;
    userId: string;
    role: string;
  }) => Promise<{ success: boolean } | void>;
}> = ({
  isOpen,
  setIsOpen,
  userId,
  organizationId,
  userRole,
  userRoleHierarchy,
  organizationSlug,
  onUpdateRole,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="gap-6 rounded-xl p-6 sm:max-w-xl sm:p-8">
        <DialogHeader className="space-y-2">
          <DialogTitle>
            <Trans i18nKey={'organizations:updateMemberRoleModalHeading'} />
          </DialogTitle>
          <DialogDescription>
            <Trans i18nKey={'organizations:updateMemberRoleModalDescription'} />
          </DialogDescription>
        </DialogHeader>

        <RolesDataProvider maxRoleHierarchy={userRoleHierarchy}>
          {(data) => (
            <UpdateMemberForm
              onSuccess={() => setIsOpen(false)}
              userId={userId}
              organizationId={organizationId}
              organizationSlug={organizationSlug}
              onUpdateRole={onUpdateRole}
              userRole={userRole}
              roles={data}
            />
          )}
        </RolesDataProvider>
      </DialogContent>
    </Dialog>
  );
};

function UpdateMemberForm({
  userId,
  userRole,
  organizationId: _organizationId,
  organizationSlug,
  onUpdateRole,
  onSuccess,
  roles,
}: React.PropsWithChildren<{
  userId: string;
  userRole: Role;
  organizationId: string;
  organizationSlug?: string;
  onUpdateRole?: (params: {
    organizationSlug: string;
    userId: string;
    role: string;
  }) => Promise<{ success: boolean } | void>;
  onSuccess: () => void;
  roles: Role[];
}>) {
  const { t } = useTranslation('teams');

  useCsrfToken();
  const [isPending, setIsPending] = useState(false);
  const [apiPending, setApiPending] = useState(false);
  const [apiError, setApiError] = useState(false);

  const error = onUpdateRole ? apiError : false;
  const pending = onUpdateRole ? apiPending : isPending;

  const onSubmit = async ({ role }: { role: Role }) => {
    if (onUpdateRole && organizationSlug) {
      setApiError(false);
      setApiPending(true);
      try {
        const result = await onUpdateRole({ organizationSlug, userId, role });
        if (!result || result.success !== false) {
          onSuccess();
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
    // Original: fetcher.submit({ intent: 'update-member-role', payload: { organizationId, userId, role, csrfToken } }, { method: 'POST', encType: 'application/json' })
    setIsPending(true);
  };

  const form = useForm({
    resolver: zodResolver(
      RoleSchema.refine(
        (data) => {
          return data.role !== userRole;
        },
        {
          message: t(`roleMustBeDifferent`),
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
        data-test={'update-member-role-form'}
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <If condition={error}>
          <UpdateRoleErrorAlert />
        </If>

        <FormField
          name={'role'}
          render={({ field }) => {
            return (
              <FormItem className="space-y-2">
                <FormLabel>{t('roleLabel')}</FormLabel>
                <FormControl>
                  <MembershipRoleSelector
                    roles={roles}
                    currentUserRole={userRole}
                    value={field.value}
                    onChange={(newRole) => form.setValue('role', newRole)}
                  />
                </FormControl>
                <FormDescription>{t('updateRoleDescription')}</FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            data-test={'confirm-update-member-role'}
            disabled={pending}
            className="h-11 min-w-[120px] cursor-pointer bg-[#ffcb51] px-6 font-semibold text-black hover:bg-[#ffcb51]/90"
          >
            <If condition={pending}>
              <Spinner className="mr-2 h-4 w-4" />
            </If>
            <Trans i18nKey={'organizations:updateRoleSubmitLabel'} />
          </Button>
        </div>
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
