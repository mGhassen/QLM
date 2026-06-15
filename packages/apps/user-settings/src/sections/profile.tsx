import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Code } from '@guepard/domain/common';
import {
  DomainException,
  invalidCurrentPasswordException,
} from '@guepard/domain/exceptions';
import { useShell } from '@guepard/shell-runtime';
import { useFetchAuthFactors } from '@guepard/supabase/hooks/use-fetch-mfa-factors';
import { useSupabase } from '@guepard/supabase/hooks/use-supabase';
import { useUser } from '@guepard/supabase/hooks/use-user';
import { useUserIdentities } from '@guepard/supabase/hooks/use-user-identities';
import {
  UserProfileSection,
  type MfaFactorRow,
  type MfaSetupEnrollPayload,
} from '@guepard/user-profile';

export function ProfileSection() {
  const { t } = useTranslation('user-profile');
  const shell = useShell();
  const supabase = useSupabase();
  const user = useUser();
  const identities = useUserIdentities();

  const accountQuery = useQuery({
    queryKey: shell.personalAccount.keys.mine,
    queryFn: () => shell.personalAccount.getMine(),
  });

  const nameMutation = useMutation({
    mutationFn: (name: string) => shell.personalAccount.updateMine({ name }),
    onSuccess: () => {
      toast.success(t('name.updated'));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => shell.personalAccount.uploadAvatar(file),
    onSuccess: () => {
      toast.success(t('picture.updated'));
    },
    onError: () => {
      toast.error(t('picture.error'));
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => shell.personalAccount.clearAvatar(),
    onSuccess: () => {
      toast.success(t('picture.updated'));
    },
    onError: () => {
      toast.error(t('picture.error'));
    },
  });

  const [passwordCurrentError, setPasswordCurrentError] = useState<
    string | null
  >(null);

  const passwordMutation = useMutation({
    mutationFn: (input: { current: string; next: string }) => {
      const sessionEmail = user.data?.email ?? '';
      return shell.personalAccount.updatePassword({
        sessionEmail,
        current: input.current,
        next: input.next,
      });
    },
    onSuccess: () => {
      setPasswordCurrentError(null);
      toast.success(t('password.updated'));
    },
    onError: (error: unknown) => {
      if (
        error instanceof DomainException &&
        error.code === Code.INVALID_CURRENT_PASSWORD_ERROR.code
      ) {
        setPasswordCurrentError(t('password.invalidCurrent'));
        return;
      }
      toast.error(t('password.invalidCurrent'));
    },
  });

  const userId = user.data?.id ?? '';
  const factorsQuery = useFetchAuthFactors({ userId });
  const mfaFactors: ReadonlyArray<MfaFactorRow> = (
    factorsQuery.data?.totp ?? []
  ).map((factor) => ({
    id: factor.id,
    friendlyName: factor.friendly_name ?? factor.id,
  }));

  const [mfaEnrollError, setMfaEnrollError] = useState<string | null>(null);
  const [mfaVerifyError, setMfaVerifyError] = useState<string | null>(null);
  const [mfaUnenrollError, setMfaUnenrollError] = useState<string | null>(null);

  const enrollMutation = useMutation({
    mutationFn: (friendlyName: string) => shell.mfa.enrollTotp(friendlyName),
    onSuccess: () => {
      setMfaEnrollError(null);
    },
    onError: () => {
      setMfaEnrollError(t('mfa.enrollError'));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (input: { factorId: string; code: string }) => {
      await shell.mfa.verify(input);
      // Refresh the session so the new AAL2 claim is on the client.
      await supabase.auth.refreshSession();
    },
    onSuccess: () => {
      setMfaVerifyError(null);
      toast.success(t('mfa.enabled'));
    },
    onError: () => {
      setMfaVerifyError(t('mfa.verifyError'));
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: async (input: {
      factorId: string;
      currentPassword: string;
    }) => {
      const sessionEmail = user.data?.email ?? '';
      const reauth = await supabase.auth.signInWithPassword({
        email: sessionEmail,
        password: input.currentPassword,
      });
      if (reauth.error) {
        throw invalidCurrentPasswordException();
      }
      await shell.mfa.unenroll(input.factorId);
    },
    onSuccess: () => {
      setMfaUnenrollError(null);
      toast.success(t('mfa.unenrollRemoved'));
    },
    onError: (error: unknown) => {
      if (
        error instanceof DomainException &&
        error.code === Code.INVALID_CURRENT_PASSWORD_ERROR.code
      ) {
        setMfaUnenrollError(t('password.invalidCurrent'));
        return;
      }
      setMfaUnenrollError(t('mfa.unenrollError'));
    },
  });

  const fallbackName = user.data?.email ?? '';
  const name = accountQuery.data?.name ?? fallbackName;
  const pictureUrl = accountQuery.data?.pictureUrl ?? null;
  const isPasswordLinked =
    identities.identities.length === 0
      ? true
      : identities.identities.some((identity) => identity.provider === 'email');

  const isMfaPending =
    enrollMutation.isPending ||
    verifyMutation.isPending ||
    unenrollMutation.isPending;

  return (
    <UserProfileSection
      name={name}
      pictureUrl={pictureUrl}
      isPasswordLinked={isPasswordLinked}
      isSubmittingName={nameMutation.isPending}
      isSubmittingPicture={uploadMutation.isPending || clearMutation.isPending}
      isSubmittingPassword={passwordMutation.isPending}
      passwordCurrentError={passwordCurrentError}
      onSubmitName={async (nextName) => {
        await nameMutation.mutateAsync(nextName);
      }}
      onUploadPicture={async (file) => {
        await uploadMutation.mutateAsync(file);
      }}
      onClearPicture={async () => {
        await clearMutation.mutateAsync();
      }}
      onSubmitPassword={async (input) => {
        setPasswordCurrentError(null);
        try {
          await passwordMutation.mutateAsync(input);
        } catch {
          // Already mapped in onError.
        }
      }}
      mfaFactors={mfaFactors}
      isMfaLoading={factorsQuery.isLoading}
      isMfaPending={isMfaPending}
      mfaEnrollError={mfaEnrollError}
      mfaVerifyError={mfaVerifyError}
      mfaUnenrollError={mfaUnenrollError}
      onEnrollMfa={async (friendlyName): Promise<MfaSetupEnrollPayload> => {
        setMfaEnrollError(null);
        const result = await enrollMutation.mutateAsync(friendlyName);
        return {
          factorId: result.id,
          qrCode: result.totp.qrCode,
          secret: result.totp.secret,
        };
      }}
      onVerifyMfa={async (input) => {
        setMfaVerifyError(null);
        await verifyMutation.mutateAsync(input);
      }}
      onCancelMfaSetup={async (pendingFactorId) => {
        setMfaEnrollError(null);
        setMfaVerifyError(null);
        if (pendingFactorId) {
          // Best-effort cleanup of an unverified factor.
          try {
            await shell.mfa.unenroll(pendingFactorId);
          } catch {
            // Swallow — server may have already removed it on session expiry.
          }
        }
      }}
      onUnenrollMfa={async (input) => {
        setMfaUnenrollError(null);
        try {
          await unenrollMutation.mutateAsync(input);
        } catch {
          // Already mapped in onError.
        }
      }}
      onClearMfaUnenrollError={() => setMfaUnenrollError(null)}
    />
  );
}
