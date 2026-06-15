import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MfaCard, type MfaFactorRow } from './mfa-card';
import {
  MultiFactorAuthSetupDialog,
  type MfaSetupEnrollPayload,
} from './multi-factor-auth-setup-dialog';
import { NameCard } from './name-card';
import { PasswordCard } from './password-card';
import { PictureCard } from './picture-card';

export type UserProfileSectionProps = Readonly<{
  name: string;
  pictureUrl: string | null;
  isPasswordLinked?: boolean;
  isSubmittingName?: boolean;
  isSubmittingPicture?: boolean;
  isSubmittingPassword?: boolean;
  passwordCurrentError?: string | null;
  mfaFactors?: ReadonlyArray<MfaFactorRow>;
  isMfaLoading?: boolean;
  isMfaPending?: boolean;
  mfaEnrollError?: string | null;
  mfaVerifyError?: string | null;
  mfaUnenrollError?: string | null;
  onSubmitName: (name: string) => void | Promise<void>;
  onUploadPicture: (file: File) => void | Promise<void>;
  onClearPicture: () => void | Promise<void>;
  onSubmitPassword: (input: {
    current: string;
    next: string;
  }) => void | Promise<void>;
  onEnrollMfa?: (friendlyName: string) => Promise<MfaSetupEnrollPayload>;
  onVerifyMfa?: (input: { factorId: string; code: string }) => Promise<void>;
  onCancelMfaSetup?: (pendingFactorId: string | null) => void;
  onUnenrollMfa?: (input: {
    factorId: string;
    currentPassword: string;
  }) => Promise<void>;
  onClearMfaUnenrollError?: () => void;
}>;

export function UserProfileSection({
  name,
  pictureUrl,
  isPasswordLinked = true,
  isSubmittingName,
  isSubmittingPicture,
  isSubmittingPassword,
  passwordCurrentError,
  mfaFactors = [],
  isMfaLoading,
  isMfaPending,
  mfaEnrollError,
  mfaVerifyError,
  mfaUnenrollError,
  onSubmitName,
  onUploadPicture,
  onClearPicture,
  onSubmitPassword,
  onEnrollMfa,
  onVerifyMfa,
  onCancelMfaSetup,
  onUnenrollMfa,
  onClearMfaUnenrollError,
}: UserProfileSectionProps) {
  const { t } = useTranslation('user-profile');
  const [isSetupOpen, setSetupOpen] = useState(false);

  const handleEnrollWrapped = onEnrollMfa
    ? async (friendlyName: string) => onEnrollMfa(friendlyName)
    : undefined;

  const handleVerifyWrapped = onVerifyMfa
    ? async (input: { factorId: string; code: string }) => {
        await onVerifyMfa(input);
        setSetupOpen(false);
      }
    : undefined;

  const handleCancel = (pendingFactorId: string | null) => {
    setSetupOpen(false);
    onCancelMfaSetup?.(pendingFactorId);
  };

  return (
    <div className="flex w-full flex-col space-y-4 p-6 pb-32">
      <header className="space-y-1 pb-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('sectionTitle')}
        </h2>
      </header>
      <PictureCard
        displayName={name}
        pictureUrl={pictureUrl}
        isPending={isSubmittingPicture}
        onUpload={onUploadPicture}
        onClear={onClearPicture}
      />
      <NameCard
        name={name}
        isSubmitting={isSubmittingName}
        onSubmit={onSubmitName}
      />
      <PasswordCard
        isLinked={isPasswordLinked}
        isSubmitting={isSubmittingPassword}
        currentPasswordError={passwordCurrentError}
        onSubmit={onSubmitPassword}
      />
      <MfaCard
        factors={mfaFactors}
        isLoading={isMfaLoading}
        isPending={isMfaPending}
        unenrollError={mfaUnenrollError}
        onSetup={
          onEnrollMfa && onVerifyMfa ? () => setSetupOpen(true) : undefined
        }
        onUnenroll={onUnenrollMfa}
        onClearUnenrollError={onClearMfaUnenrollError}
      />
      {handleEnrollWrapped && handleVerifyWrapped ? (
        <MultiFactorAuthSetupDialog
          open={isSetupOpen}
          enrollError={mfaEnrollError}
          verifyError={mfaVerifyError}
          isEnrolling={isMfaPending}
          isVerifying={isMfaPending}
          onEnroll={handleEnrollWrapped}
          onVerify={handleVerifyWrapped}
          onCancel={handleCancel}
        />
      ) : null}
    </div>
  );
}
