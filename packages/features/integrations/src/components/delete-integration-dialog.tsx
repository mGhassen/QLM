import * as React from 'react';

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

export type DeleteIntegrationDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationName: string;
  /** Story escape hatch: pre-fill the confirmation input so a story can render the "about to confirm" state without play functions. */
  initialConfirmation?: string;
  onConfirm: () => void;
}>;

export function DeleteIntegrationDialog(
  props: DeleteIntegrationDialogProps,
): React.ReactElement {
  const { t } = useTranslation('integrations');
  const {
    open,
    onOpenChange,
    integrationName,
    initialConfirmation = '',
    onConfirm,
  } = props;
  const [confirmation, setConfirmation] = React.useState(initialConfirmation);

  React.useEffect(() => {
    if (open) {
      setConfirmation(initialConfirmation);
    }
  }, [open, initialConfirmation]);

  const canDelete = confirmation === integrationName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('delete.title')}</DialogTitle>
          <DialogDescription>{t('delete.body')}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canDelete) {
              onConfirm();
            }
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-confirmation">
              {t('delete.confirmLabel', { name: integrationName })}
            </Label>
            <Input
              id="delete-confirmation"
              data-test="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('delete.cancelCta')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!canDelete}
              data-test="delete-confirm"
            >
              {t('delete.confirmCta')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
