'use client';

import { getSafeRedirectPath } from '@guepard/shared/utils';
import { useSignOut } from '@guepard/supabase/hooks/use-sign-out';
import { Button } from '@guepard/ui/button';
import { Trans } from '@guepard/ui/trans';

export function SignOutInvitationButton(
  props: React.PropsWithChildren<{
    nextPath: string;
  }>,
) {
  const signOut = useSignOut();

  return (
    <Button
      variant={'ghost'}
      onClick={async () => {
        await signOut.mutateAsync();
        window.location.assign(getSafeRedirectPath(props.nextPath, '/'));
      }}
    >
      <Trans i18nKey={'organizations:signInWithDifferentAccount'} />
    </Button>
  );
}
