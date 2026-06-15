import { useState } from 'react';

import { CsrfTokenFormField, useCsrfToken } from '@guepard/csrf/client';
import { Button } from '@guepard/ui/button';
import { Heading } from '@guepard/ui/heading';
import { If } from '@guepard/ui/if';
import { Separator } from '@guepard/ui/separator';
import { Trans } from '@guepard/ui/trans';

import { SignOutInvitationButton } from './sign-out-invitation-button';

export function AcceptInvitationContainer(props: {
  inviteToken: string;
  email: string;

  invitation: {
    id: string;

    account: {
      name: string;
      id: string;
      picture_url: string | null;
    };
  };

  paths: {
    signOutNext: string;
    nextPath: string;
  };
}) {
  const [isPending, setIsPending] = useState(false);
  const csrfToken = useCsrfToken();

  const pending = isPending;

  return (
    <div className={'flex flex-col items-center space-y-4'}>
      <Heading className={'text-center'} level={4}>
        <Trans
          i18nKey={'organizations:acceptInvitationHeading'}
          values={{
            accountName: props.invitation.account.name,
          }}
        />
      </Heading>

      <If condition={props.invitation.account.picture_url}>
        {(url) => (
          <img
            alt={`Logo`}
            src={url}
            width={64}
            height={64}
            className={'object-cover'}
          />
        )}
      </If>

      <div className={'text-muted-foreground text-center text-sm'}>
        <Trans
          i18nKey={'organizations:acceptInvitationDescription'}
          values={{
            accountName: props.invitation.account.name,
          }}
        />
      </div>

      <div className={'flex flex-col space-y-4'}>
        <form
          method={'POST'}
          data-test={'join-team-form'}
          className={'w-full'}
          onSubmit={() => setIsPending(true)}
        >
          <input type="hidden" name={'inviteToken'} value={props.inviteToken} />

          <CsrfTokenFormField value={csrfToken} />

          <input
            type={'hidden'}
            name={'nextPath'}
            value={props.paths.nextPath}
          />

          <Button type={'submit'} className={'w-full'} disabled={pending}>
            <Trans
              i18nKey={
                pending
                  ? 'organizations:joiningTeam'
                  : 'organizations:continueAs'
              }
              values={{
                accountName: props.invitation.account.name,
                email: props.email,
              }}
            />
          </Button>
        </form>

        <Separator />

        <SignOutInvitationButton nextPath={props.paths.signOutNext} />

        <span className={'text-muted-foreground text-center text-xs'}>
          <Trans
            i18nKey={'organizations:signInWithDifferentAccountDescription'}
          />
        </span>
      </div>
    </div>
  );
}
