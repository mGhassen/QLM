import * as React from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@guepard/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@guepard/ui/dialog';
import { Input } from '@guepard/ui/input';
import { Label } from '@guepard/ui/label';

export type RenameIntegrationDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onSubmit: (nextName: string) => void;
}>;

export function RenameIntegrationDialog(
  props: RenameIntegrationDialogProps,
): React.ReactElement {
  const { t } = useTranslation('integrations');
  const { open, onOpenChange, currentName, onSubmit } = props;
  const [value, setValue] = React.useState(currentName);

  React.useEffect(() => {
    if (open) {
      setValue(currentName);
    }
  }, [open, currentName]);

  const trimmed = value.trim();
  const isValid = trimmed.length > 0 && trimmed.length <= 60;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('rename.title')}</DialogTitle>
          <DialogDescription>{t('rename.body')}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid) {
              onSubmit(trimmed);
            }
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="rename-name">{t('form.nameLabel')}</Label>
            <Input
              id="rename-name"
              data-test="rename-name"
              value={value}
              onChange={(event) => setValue(event.target.value)}
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
            <Button type="submit" disabled={!isValid}>
              {t('form.saveCta')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
