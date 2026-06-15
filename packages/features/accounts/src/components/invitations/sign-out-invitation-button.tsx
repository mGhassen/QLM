'use client';

import { getSafeRedirectPath } from '@qlm/shared/utils';
import { useSignOut } from '@qlm/supabase/hooks/use-sign-out';
import { Button } from '@qlm/ui/button';
import { Trans } from '@qlm/ui/trans';

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
