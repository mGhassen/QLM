import { useTranslation } from 'react-i18next';

import type { DatasourceExtension } from '@guepard/extensions-sdk';
import { Sheet, SheetContent, SheetTitle } from '@guepard/ui/sheet';

import {
  DatasourceConnectForm,
  type DatasourceConnectFormProps,
} from './datasource-connect-form';

export interface DatasourceConnectSheetProps extends Omit<
  DatasourceConnectFormProps,
  'showHeader' | 'variant'
> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extension: DatasourceExtension;
}

/**
 * Slide-over sheet containing the datasource connect form. Behaves like a
 * controlled dialog: parent owns `open`, `name`, and the mutation callbacks.
 */
export function DatasourceConnectSheet({
  open,
  onOpenChange,
  extension,
  ...formProps
}: Readonly<DatasourceConnectSheetProps>) {
  const { t } = useTranslation('datasources');
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-[92vw] max-w-[48rem] flex-col gap-0 overflow-hidden p-0 sm:max-w-[48rem]"
      >
        <SheetTitle className="sr-only">
          {t('new_pageTitle', { name: extension.name })}
        </SheetTitle>
        <DatasourceConnectForm
          extension={extension}
          showHeader
          variant="sheet"
          className="min-h-0 flex-1"
          {...formProps}
        />
      </SheetContent>
    </Sheet>
  );
}
