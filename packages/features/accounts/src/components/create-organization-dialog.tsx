import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useCsrfToken } from '@qlm/csrf/client';
import { Alert, AlertDescription, AlertTitle } from '@qlm/ui/alert';
import { Button } from '@qlm/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@qlm/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@qlm/ui/form';
import { If } from '@qlm/ui/if';
import { Input } from '@qlm/ui/input';
import { Trans } from '@qlm/ui/trans';

import { CreateOrganizationSchema } from '../schema/create-organization.schema';

export function CreateOrganizationDialog(
  props: React.PropsWithChildren<{
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onSuccess?: (organization: {
      id: string;
      slug: string;
      name: string;
    }) => void;
  }>,
) {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.setIsOpen}>
      <DialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey={'organizations:createOrganizationModalHeading'} />
          </DialogTitle>

          <DialogDescription>
            <Trans
              i18nKey={'organizations:createOrganizationModalDescription'}
            />
          </DialogDescription>
        </DialogHeader>

        <CreateOrganizationForm
          onClose={() => props.setIsOpen(false)}
          onSuccess={props.onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

function CreateOrganizationForm(props: {
  onClose: () => void;
  onSuccess?: (organization: {
    id: string;
    slug: string;
    name: string;
  }) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);

  const csrfToken = useCsrfToken();

  const form = useForm<z.infer<typeof CreateOrganizationSchema>>({
    defaultValues: {
      name: '',
      csrfToken,
    },
    resolver: zodResolver(CreateOrganizationSchema),
  });

  const pending = isPending;

  return (
    <Form {...form}>
      <form
        data-test={'create-organization-form'}
        onSubmit={form.handleSubmit((_data) => {
          // TODO: wire up server action integration
          // Original: fetcher.submit({ intent: 'create-organization', payload: data }, { method: 'POST', action: '/api/organizations', encType: 'application/json' })
          setIsPending(true);
          setError(false);
        })}
      >
        <div className={'flex flex-col space-y-4'}>
          <If condition={error}>
            <CreateOrganizationErrorAlert />
          </If>

          <FormField
            name={'name'}
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey={'organizations:organizationNameLabel'} />
                  </FormLabel>

                  <FormControl>
                    <Input
                      data-test={'create-organization-name-input'}
                      required
                      minLength={2}
                      maxLength={50}
                      placeholder={''}
                      {...field}
                    />
                  </FormControl>

                  <FormDescription>
                    <Trans
                      i18nKey={'organizations:organizationNameDescription'}
                    />
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <div className={'flex justify-end space-x-2'}>
            <Button
              variant={'outline'}
              type={'button'}
              disabled={pending}
              onClick={props.onClose}
            >
              <Trans i18nKey={'common:cancel'} />
            </Button>

            <Button
              data-test={'confirm-create-organization-button'}
              disabled={pending}
            >
              {pending ? (
                <Trans i18nKey={'organizations:creatingOrganization'} />
              ) : (
                <Trans
                  i18nKey={'organizations:createOrganizationSubmitLabel'}
                />
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

function CreateOrganizationErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <AlertTitle>
        <Trans i18nKey={'organizations:createOrganizationErrorHeading'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'organizations:createOrganizationErrorMessage'} />
      </AlertDescription>
    </Alert>
  );
}
