import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';

import type { Datasource } from '@guepard/domain/entities';
import type { DatasourceExtension } from '@guepard/extensions-sdk';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@guepard/ui/alert-dialog';
import { Button } from '@guepard/ui/button';
import { Input } from '@guepard/ui/input';
import { PageBody } from '@guepard/ui/page';

import {
  DatasourceConnectForm,
  type DatasourceConnectFormProps,
} from './datasource-connect-form';

export interface DatasourceSettingsPanelProps extends Omit<
  DatasourceConnectFormProps,
  | 'extension'
  | 'showHeader'
  | 'variant'
  | 'name'
  | 'onNameChange'
  | 'onRandomizeName'
  | 'onCancel'
> {
  datasource: Datasource;
  extension: DatasourceExtension;
  onRename: (name: string) => void;
  onDelete: () => void | Promise<void>;
  isDeleting?: boolean;
}

/**
 * Detail-view settings panel: shows the current config in an editable form,
 * plus rename, test-connection, update and delete actions.
 */
export function DatasourceSettingsPanel({
  datasource,
  extension,
  onRename,
  onDelete,
  isDeleting = false,
  ...formProps
}: Readonly<DatasourceSettingsPanelProps>) {
  const { t } = useTranslation('datasources');
  const [name, setName] = useState(datasource.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(datasource.name);
  }, [datasource.name]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== datasource.name) {
      onRename(trimmed);
    } else {
      setName(datasource.name);
    }
    setIsEditingName(false);
  };

  return (
    <>
      <PageBody className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
            <header className="flex items-center gap-4">
              {extension.icon && (
                <img
                  src={extension.icon}
                  alt={extension.name}
                  className="h-12 w-12 rounded object-contain"
                />
              )}
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {t('view_pageTitle', { name: extension.name })}
                </h1>
                {extension.description && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {extension.description}
                  </p>
                )}
              </div>
            </header>

            <section className="border-border border-b pb-6">
              <label className="text-muted-foreground mb-2 block text-sm font-medium">
                {t('nameLabel')}
              </label>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <Input
                    ref={nameInputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitName();
                      } else if (e.key === 'Escape') {
                        setName(datasource.name);
                        setIsEditingName(false);
                      }
                    }}
                    className="flex-1"
                  />
                ) : (
                  <div className="flex flex-1 items-center gap-2">
                    <span className="text-base font-medium">{name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setIsEditingName(true)}
                      aria-label={t('editNameAriaLabel')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <DatasourceConnectForm
              {...formProps}
              extension={extension}
              name={name}
              onNameChange={setName}
              onCancel={() => {}}
              showHeader={false}
              variant="default"
            />

            <div className="flex justify-start pt-2">
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isDeleting}
                data-test="datasource-delete-button"
              >
                {isDeleting ? t('deleting') : t('deleteButton')}
              </Button>
            </div>
          </div>
        </div>
      </PageBody>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setIsDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmDescription', { name: datasource.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void onDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
