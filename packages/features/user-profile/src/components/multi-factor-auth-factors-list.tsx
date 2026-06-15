import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@qlm/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@qlm/ui/dialog';
import { Input } from '@qlm/ui/input';
import { Label } from '@qlm/ui/label';

import type { MfaFactorRow } from './mfa-card';

export type MultiFactorAuthFactorsListProps = Readonly<{
  factors: ReadonlyArray<MfaFactorRow>;
  isPending?: boolean;
  /** Inline error from a wrong-password unenroll attempt. */
  unenrollError?: string | null;
  /** Triggers re-auth + unenroll. Throws on wrong password. */
  onUnenroll: (input: {
    factorId: string;
    currentPassword: string;
  }) => Promise<void>;
  /** Called when the user clears the inline error (e.g. types in the password input). */
  onClearError?: () => void;
}>;

export function MultiFactorAuthFactorsList({
  factors,
  isPending = false,
  unenrollError = null,
  onUnenroll,
  onClearError,
}: MultiFactorAuthFactorsListProps) {
  const { t } = useTranslation('user-profile');
  const [confirmingFactorId, setConfirmingFactorId] = useState<string | null>(
    null,
  );
  const [password, setPassword] = useState('');

  const handleClose = () => {
    setConfirmingFactorId(null);
    setPassword('');
    onClearError?.();
  };

  const handleConfirm = async () => {
    if (!confirmingFactorId) return;
    try {
      await onUnenroll({
        factorId: confirmingFactorId,
        currentPassword: password,
      });
      handleClose();
    } catch {
      // Parent surfaces unenrollError via prop; modal stays open.
    }
  };

  if (factors.length === 0) return null;

  return (
    <>
      <ul className="space-y-1" data-test="mfa-factors-list">
        {factors.map((factor) => (
          <li
            key={factor.id}
            data-test={`mfa-factor-row-${factor.id}`}
            className="bg-muted/40 flex items-center justify-between rounded-md px-3 py-2 text-sm"
          >
            <span>{factor.friendlyName}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              data-test={`mfa-factor-remove-${factor.id}`}
              onClick={() => {
                setConfirmingFactorId(factor.id);
                setPassword('');
                onClearError?.();
              }}
            >
              {t('mfa.remove')}
            </Button>
          </li>
        ))}
      </ul>

      <Dialog
        open={confirmingFactorId !== null}
        onOpenChange={(next) => {
          if (!next) handleClose();
        }}
      >
        <DialogContent data-test="mfa-unenroll-dialog">
          <DialogHeader>
            <DialogTitle>{t('mfa.remove')}</DialogTitle>
            <DialogDescription>{t('mfa.unenrollConfirm')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="mfa-unenroll-password">
              {t('password.current')}
            </Label>
            <Input
              id="mfa-unenroll-password"
              data-test="mfa-unenroll-password"
              type="password"
              autoComplete="current-password"
              disabled={isPending}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (unenrollError) onClearError?.();
              }}
            />
            {unenrollError ? (
              <p
                role="alert"
                data-test="mfa-unenroll-error"
                className="text-destructive text-xs"
              >
                {unenrollError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isPending}
              data-test="mfa-unenroll-cancel"
            >
              {t('mfa.dialog.cancel')}
            </Button>
            <Button
              type="button"
              data-test="mfa-unenroll-confirm"
              onClick={handleConfirm}
              disabled={isPending || password.length === 0}
            >
              {t('mfa.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
