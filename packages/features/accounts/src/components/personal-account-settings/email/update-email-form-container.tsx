'use client';

import { useUser } from '@qlm/supabase/hooks/use-user';
import { LoadingOverlay } from '@qlm/ui/loading-overlay';

import { UpdateEmailForm } from './update-email-form';

export function UpdateEmailFormContainer(props: { callbackPath: string }) {
  const { data: user, isPending } = useUser();

  if (isPending) {
    return <LoadingOverlay fullPage={false} />;
  }

  const currentEmail = user?.email;

  if (!currentEmail) {
    return null;
  }

  return (
    <UpdateEmailForm callbackPath={props.callbackPath} email={currentEmail} />
  );
}
