'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Plus, X } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useCsrfToken } from '@guepard/csrf/client';
import { Alert, AlertDescription } from '@guepard/ui/alert';
import { Button } from '@guepard/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@guepard/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@guepard/ui/form';
import { If } from '@guepard/ui/if';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@guepard/ui/input-group';
import { Spinner } from '@guepard/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@guepard/ui/tooltip';
import { Trans } from '@guepard/ui/trans';

import { createInvitationsSchema } from '../../schema';
import { MembershipRoleSelector } from './membership-role-selector';
import { RolesDataProvider } from './roles-data-provider';

type InviteModel = ReturnType<typeof createEmptyInviteModel>;

type Role = string;

type InvitePayload = {
  invitations: InviteModel[];
  organizationSlug: string;
};

/**
 * The maximum number of invites that can be sent at once.
 * Useful to avoid spamming the server with too large payloads
 */
const MAX_INVITES = 5;

export function InviteMembersDialogContainer({
  organizationSlug,
  userRoleHierarchy,
  onInvite,
  children,
}: React.PropsWithChildren<{
  organizationSlug: string;
  userRoleHierarchy: number;
  onInvite: (payload: InvitePayload) => Promise<void>;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (payload: InvitePayload) => {
    setIsPending(true);
    try {
      await onInvite(payload);
      toast.success('Invitations sent');
      setIsOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send invitations';
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} modal>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className="rounded-xl p-6 sm:max-w-xl sm:p-8"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2 pb-2">
          <DialogTitle className="text-lg">
            <Trans i18nKey={'organizations:inviteMembersHeading'} />
          </DialogTitle>
          <DialogDescription className="text-sm">
            <Trans i18nKey={'organizations:inviteMembersDescription'} />
          </DialogDescription>
        </DialogHeader>

        <RolesDataProvider maxRoleHierarchy={userRoleHierarchy}>
          {(roles) => (
            <InviteMembersForm
              key={isOpen ? 'open' : 'closed'}
              organizationSlug={organizationSlug}
              pending={isPending}
              roles={roles}
              onSubmit={handleSubmit}
            />
          )}
        </RolesDataProvider>
      </DialogContent>
    </Dialog>
  );
}

function InviteMembersForm({
  onSubmit,
  roles,
  organizationSlug,
  pending,
}: {
  onSubmit: (data: InvitePayload) => void;
  pending: boolean;
  roles: string[];
  organizationSlug: string;
}) {
  const { t } = useTranslation('teams');
  const csrfToken = useCsrfToken();

  const schema = createInvitationsSchema(roles);
  const form = useForm({
    resolver: zodResolver(schema),
    shouldUseNativeValidation: true,
    reValidateMode: 'onSubmit',
    defaultValues: {
      invitations: [createEmptyInviteModel()],
      organizationSlug,
      csrfToken,
    },
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: 'invitations',
  });

  const rootError =
    form.formState.errors.invitations?.message &&
    typeof form.formState.errors.invitations.message === 'string'
      ? form.formState.errors.invitations.message
      : null;

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document
        .querySelector<HTMLInputElement>('[data-test="invite-email-input"]')
        ?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-8"
        data-test={'invite-members-form'}
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            invitations: values.invitations,
            organizationSlug: values.organizationSlug,
          }),
        )}
      >
        <If condition={rootError}>
          <Alert variant="destructive">
            <AlertDescription>{rootError}</AlertDescription>
          </Alert>
        </If>

        <div className="flex flex-col gap-4">
          {fieldArray.fields.map((field, index) => {
            const emailInputName = `invitations.${index}.email` as const;
            const roleInputName = `invitations.${index}.role` as const;

            return (
              <div
                data-test={'invite-member-form-item'}
                key={field.id}
                className="flex items-stretch gap-3"
              >
                <div className="flex min-w-0 flex-1 items-center">
                  <InputGroup className="h-11 w-full">
                    <InputGroupAddon align="inline-start">
                      <Mail className="h-4 w-4" />
                    </InputGroupAddon>

                    <FormField
                      name={emailInputName}
                      render={({ field }) => {
                        return (
                          <FormItem className="size-full space-y-0">
                            <FormControl className="size-full">
                              <InputGroupInput
                                data-test={'invite-email-input'}
                                placeholder={t('emailPlaceholder')}
                                type="email"
                                required
                                className="h-11"
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </InputGroup>
                </div>

                <div className="flex shrink-0 items-center">
                  <FormField
                    name={roleInputName}
                    render={({ field }) => {
                      return (
                        <FormItem className="h-11 space-y-0">
                          <FormControl>
                            <MembershipRoleSelector
                              roles={roles}
                              value={field.value}
                              placeholder={t('selectRolePlaceholder', {
                                defaultValue: 'Role',
                              })}
                              onChange={(role) => {
                                form.setValue(field.name, role);
                              }}
                              triggerClassName="h-11 min-w-[160px]"
                            />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="h-11 w-11"
                          disabled={fieldArray.fields.length <= 1}
                          data-test={'remove-invite-button'}
                          aria-label={t('removeInviteButtonLabel')}
                          onClick={() => {
                            fieldArray.remove(index);
                            form.clearErrors(emailInputName);
                          }}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>

                      <TooltipContent>
                        {t('removeInviteButtonLabel')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            );
          })}

          <If condition={fieldArray.fields.length < MAX_INVITES}>
            <p className="text-muted-foreground text-sm">
              <Trans
                i18nKey="organizations:inviteMembersHint"
                defaults="You can add up to {{count}} members at once."
                values={{ count: MAX_INVITES }}
              />
            </p>
          </If>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <If condition={fieldArray.fields.length < MAX_INVITES}>
            <Button
              data-test={'add-new-invite-button'}
              type="button"
              variant="outline"
              size="default"
              disabled={pending}
              className="h-10 w-fit"
              onClick={() => {
                fieldArray.append(createEmptyInviteModel());
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              <Trans i18nKey={'organizations:addAnotherMemberButtonLabel'} />
            </Button>
          </If>
          <Button
            data-test="confirm-invite-members-button"
            type="submit"
            disabled={pending}
            className="h-11 min-w-[140px] cursor-pointer bg-[#ffcb51] px-6 font-semibold text-black hover:bg-[#ffcb51]/90"
          >
            <If condition={pending}>
              <Spinner className="mr-2 h-4 w-4" />
            </If>
            <Trans
              i18nKey={
                pending
                  ? 'organizations:invitingMembers'
                  : 'organizations:inviteMembersButtonLabel'
              }
            />
          </Button>
        </div>
      </form>
    </Form>
  );
}

function createEmptyInviteModel() {
  return { email: '', role: '' as Role };
}
