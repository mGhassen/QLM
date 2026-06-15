import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { UserToken } from '@guepard/domain/entities';
import { Alert, AlertDescription } from '@guepard/ui/alert';
import { Button } from '@guepard/ui/button';

import { useRevokeUserTokenMutation } from '../hooks/use-revoke-user-token-mutation';

export type RevokeConfirmInlineProps = {
  token: UserToken;
  onCancel: () => void;
  onRevoked: (row: UserToken) => void;
};

/**
 * "revoke-confirm" pane state — an INLINE confirmation block (NOT a Radix
 * `Dialog`). AM-1 forbids stacking dialogs on top of the Settings dialog;
 * a centered `<div>` with the right ARIA attributes inside the same pane
 * is the right shape.
 *
 * Visual: subtle backdrop dim over the pane, centered card with heading +
 * body + Cancel / Revoke. On Revoke success: emits `onRevoked(updatedRow)`
 * AND fires a sonner toast.
 */
export function RevokeConfirmInline({
  token,
  onCancel,
  onRevoked,
}: Readonly<RevokeConfirmInlineProps>) {
  const { t } = useTranslation('tokens');
  const mutation = useRevokeUserTokenMutation();

  const errorMessage =
    mutation.error instanceof Error ? mutation.error.message : null;

  async function handleConfirm() {
    try {
      const updated = await mutation.mutateAsync({ id: token.id });
      toast.success(t('pane.revoke.toastSuccess'));
      onRevoked(updated);
    } catch {
      // Surfaced inline via `mutation.error` below; swallow to silence
      // React-Query's unhandled-rejection warning.
    }
  }

  return (
    <div className="relative">
      {/* Backdrop dim — purely visual, intentionally NOT a portal so the
          confirm stays inside the parent pane. */}
      <div
        aria-hidden="true"
        className="bg-background/60 absolute inset-0 -m-6"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="revoke-confirm-heading"
        aria-describedby="revoke-confirm-body"
        data-test="revoke-confirm-inline"
        className="bg-background relative mx-auto mt-12 w-full max-w-md rounded-md border p-5 shadow-lg"
      >
        <h3
          id="revoke-confirm-heading"
          className="text-foreground text-base font-semibold"
        >
          {t('pane.revoke.heading')}
        </h3>
        <p
          id="revoke-confirm-body"
          className="text-muted-foreground mt-2 text-sm"
        >
          {t('pane.revoke.body')}
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          <span className="font-mono">{token.token_name}</span>
        </p>

        {errorMessage && (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={mutation.isPending}
          >
            {t('pane.revoke.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={mutation.isPending}
            data-test="revoke-confirm-submit"
          >
            {mutation.isPending && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            {t('pane.revoke.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
