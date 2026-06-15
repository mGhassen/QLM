import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@guepard/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@guepard/ui/dialog';
import { Input } from '@guepard/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@guepard/ui/input-otp';
import { Label } from '@guepard/ui/label';

export type MfaSetupEnrollPayload = Readonly<{
  factorId: string;
  qrCode: string;
  secret: string;
}>;

export type MultiFactorAuthSetupDialogProps = Readonly<{
  open: boolean;
  /** Inline error to surface on the verify step (e.g. wrong OTP). Resets when the user types. */
  verifyError?: string | null;
  /** Inline error to surface on the name step (e.g. enroll API failure). */
  enrollError?: string | null;
  isEnrolling?: boolean;
  isVerifying?: boolean;
  /** Triggers `shell.mfa.enrollTotp(name)`. Returns the factor + QR or throws. */
  onEnroll: (friendlyName: string) => Promise<MfaSetupEnrollPayload>;
  /** Triggers verify-then-session-refresh. Throws on wrong OTP. */
  onVerify: (input: { factorId: string; code: string }) => Promise<void>;
  /** If the user cancels mid-flow after enrollment, this lets the parent unenroll the dangling factor. */
  onCancel: (pendingFactorId: string | null) => void;
}>;

export function MultiFactorAuthSetupDialog(
  props: MultiFactorAuthSetupDialogProps,
) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        if (!next) props.onCancel(null);
      }}
    >
      {props.open ? <DialogBody {...props} /> : null}
    </Dialog>
  );
}

type Step = 'name' | 'qr' | 'otp';

function DialogBody({
  verifyError = null,
  enrollError = null,
  isEnrolling = false,
  isVerifying = false,
  onEnroll,
  onVerify,
  onCancel,
}: MultiFactorAuthSetupDialogProps) {
  const { t } = useTranslation('user-profile');
  const [step, setStep] = useState<Step>('name');
  const [friendlyName, setFriendlyName] = useState('');
  const [enrollment, setEnrollment] = useState<MfaSetupEnrollPayload | null>(
    null,
  );
  const [otp, setOtp] = useState('');

  const handleClose = () => {
    onCancel(enrollment?.factorId ?? null);
  };

  const handleEnroll = async () => {
    const trimmed = friendlyName.trim();
    if (!trimmed) return;
    try {
      const payload = await onEnroll(trimmed);
      setEnrollment(payload);
      setStep('qr');
    } catch {
      // Parent surfaces enrollError via prop; nothing to do here.
    }
  };

  const handleVerify = async () => {
    if (!enrollment) return;
    try {
      await onVerify({ factorId: enrollment.factorId, code: otp });
    } catch {
      // Parent surfaces verifyError via prop; OTP stays editable.
    }
  };

  return (
    <DialogContent
      data-test="mfa-setup-dialog"
      onInteractOutside={(event) => event.preventDefault()}
      onEscapeKeyDown={(event) => event.preventDefault()}
    >
      <DialogHeader>
        <DialogTitle>{t('mfa.setupButton')}</DialogTitle>
        <DialogDescription>{t('mfa.description')}</DialogDescription>
      </DialogHeader>

      {step === 'name' ? (
        <div className="space-y-4" data-test="mfa-dialog-step-name">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">
              {t('mfa.dialog.nameTitle')}
            </h3>
            <p className="text-muted-foreground text-xs">
              {t('mfa.dialog.nameHint')}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mfa-friendly-name">
              {t('mfa.dialog.nameLabel')}
            </Label>
            <Input
              id="mfa-friendly-name"
              data-test="mfa-dialog-name"
              autoComplete="off"
              disabled={isEnrolling}
              value={friendlyName}
              onChange={(event) => setFriendlyName(event.target.value)}
            />
            {enrollError ? (
              <p
                role="alert"
                data-test="mfa-dialog-enroll-error"
                className="text-destructive text-xs"
              >
                {enrollError}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isEnrolling}
              data-test="mfa-dialog-cancel"
            >
              {t('mfa.dialog.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleEnroll}
              disabled={isEnrolling || friendlyName.trim().length === 0}
              data-test="mfa-dialog-name-next"
            >
              {t('mfa.dialog.next')}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'qr' && enrollment ? (
        <div className="space-y-4" data-test="mfa-dialog-step-qr">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{t('mfa.dialog.qrTitle')}</h3>
            <p className="text-muted-foreground text-xs">
              {t('mfa.dialog.qrHint')}
            </p>
          </div>
          <div className="flex justify-center">
            <img
              src={enrollment.qrCode}
              alt={t('mfa.dialog.qrTitle')}
              width={160}
              height={160}
              data-test="mfa-dialog-qr-image"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('mfa.dialog.manualSecret')}</Label>
            <Input
              value={enrollment.secret}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="font-mono text-xs"
              data-test="mfa-dialog-secret"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isVerifying}
              data-test="mfa-dialog-cancel"
            >
              {t('mfa.dialog.cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => setStep('otp')}
              data-test="mfa-dialog-qr-next"
            >
              {t('mfa.dialog.next')}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'otp' && enrollment ? (
        <div className="space-y-4" data-test="mfa-dialog-step-otp">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">
              {t('mfa.dialog.otpTitle')}
            </h3>
            <p className="text-muted-foreground text-xs">
              {t('mfa.dialog.otpDescription')}
            </p>
          </div>
          <div className="flex justify-center" data-test="mfa-dialog-otp">
            <InputOTP
              value={otp}
              onChange={setOtp}
              maxLength={6}
              disabled={isVerifying}
              aria-label={t('mfa.dialog.otpTitle')}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {verifyError ? (
            <p
              role="alert"
              data-test="mfa-dialog-verify-error"
              className="text-destructive text-center text-xs"
            >
              {verifyError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isVerifying}
              data-test="mfa-dialog-cancel"
            >
              {t('mfa.dialog.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || otp.length !== 6}
              data-test="mfa-dialog-enable"
            >
              {isVerifying ? t('mfa.dialog.verifying') : t('mfa.dialog.enable')}
            </Button>
          </div>
        </div>
      ) : null}
    </DialogContent>
  );
}
