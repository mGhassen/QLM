import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { MultiFactorChallengeContainer } from '@guepard/auth/mfa';
import { useSupabase } from '@guepard/supabase/hooks/use-supabase';
import { Heading } from '@guepard/ui/heading';
import { Spinner } from '@guepard/ui/spinner';
import { Trans } from '@guepard/ui/trans';

import pathsConfig from '@/config/paths.config';

export const Route = createFileRoute('/auth/verify')({
  head: () => ({ meta: [{ title: 'Verify — Rasm' }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const supabase = useSupabase();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
  }, [supabase]);

  if (userId === undefined) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Spinner />
        <Heading level={5} className="text-muted-foreground">
          <Trans i18nKey="auth:redirecting" />
        </Heading>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Heading level={5}>
          <Trans i18nKey="auth:errorAlertHeading" />
        </Heading>
      </div>
    );
  }

  return (
    <MultiFactorChallengeContainer
      userId={userId}
      paths={{ redirectPath: pathsConfig.app.home }}
    />
  );
}
