import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Pencil, Shuffle } from 'lucide-react';
import type { z } from 'zod';
import { z as zLib } from 'zod';

import type { DatasourceExtension } from '@guepard/extensions-sdk';
import { Button } from '@guepard/ui/button';
import { FormRenderer } from '@guepard/ui/form-renderer';
import { Input } from '@guepard/ui/input';
import { cn } from '@guepard/ui/utils';

import { DatasourceDocsLink } from './datasource-docs-link';

export interface DatasourceConnectFormProps {
  /** The extension being connected to. */
  extension: DatasourceExtension;
  /**
   * Zod schema describing the configuration fields.
   * If the extension has no declared schema, pass `null` and a default
   * `{connectionUrl?}` fallback is used.
   */
  schema: z.ZodTypeAny | null;
  /**
   * When true, the form renders a spinner instead of the fields —
   * used while the parent is lazy-loading the extension's schema via
   * `useExtensionSchema`. Without this, the user sees a flash of the
   * generic `{connectionUrl?}` fallback form before the real fields
   * appear.
   */
  isSchemaLoading?: boolean;
  /** Current datasource name. Controlled by the parent. */
  name: string;
  onNameChange: (name: string) => void;
  /** Generate a fresh random name. Parent owns the name generator. */
  onRandomizeName?: () => void;
  /** Submit the config values as a valid new datasource. */
  onConnect: (config: Record<string, unknown>) => void | Promise<void>;
  /** Run a connection test against the current form values. */
  onTestConnection: (config: Record<string, unknown>) => void | Promise<void>;
  onCancel: () => void;
  isConnecting?: boolean;
  isTesting?: boolean;
  showHeader?: boolean;
  className?: string;
  /** Visual variant — full-width for sheet, centered card otherwise. */
  variant?: 'default' | 'sheet';
}

/**
 * Dynamic form that renders a datasource extension's configuration fields
 * via FormRenderer. Emits `onConnect` / `onTestConnection` / `onCancel`
 * callbacks — the parent wires these to shell runtime mutations.
 */
export function DatasourceConnectForm({
  extension,
  schema,
  isSchemaLoading = false,
  name,
  onNameChange,
  onRandomizeName,
  onConnect,
  onTestConnection,
  onCancel,
  isConnecting = false,
  isTesting = false,
  showHeader = true,
  className,
  variant = 'default',
}: Readonly<DatasourceConnectFormProps>) {
  const { t, i18n } = useTranslation('datasources');
  const [isEditingName, setIsEditingName] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isFormValid, setIsFormValid] = useState(false);

  // Switching providers mid-session is safe without an explicit reset:
  // Test/Connect are disabled while `isSchemaLoading` is true (see the
  // button props below), and when the new schema arrives, `FormRenderer`
  // remounts via `key={extension.id}` and its `onFormReady` callback
  // overwrites `formValues` with the new default shape before the
  // buttons re-enable.

  // Fallback: accept any passthrough object when the extension has no schema.
  const fallbackSchema = useMemo(
    () =>
      zLib
        .object({
          connectionUrl: zLib.string().optional(),
          connectionString: zLib.string().optional(),
        })
        .passthrough(),
    [],
  );
  const effectiveSchema = schema ?? fallbackSchema;

  const handleNameSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      onRandomizeName?.();
    }
    setIsEditingName(false);
  }, [name, onRandomizeName]);

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSave();
    }
    if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  const handleTest = async () => {
    if (!formValues) return;
    const parsed = effectiveSchema.safeParse(formValues);
    if (!parsed.success) return;
    await onTestConnection(parsed.data as Record<string, unknown>);
  };

  const handleConnect = async () => {
    if (!formValues) return;
    const parsed = effectiveSchema.safeParse(formValues);
    if (!parsed.success) return;
    await onConnect(parsed.data as Record<string, unknown>);
  };

  const isPending = isConnecting || isTesting;

  const headerEl = showHeader ? (
    <header
      className={cn(
        'space-y-3',
        variant === 'sheet' ? 'shrink-0 px-6 pt-6 pr-12 pb-4' : 'px-4',
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="bg-muted/30 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
          {extension.icon && (
            <img
              src={extension.icon}
              alt={extension.name}
              className={cn(
                'h-9 w-9 object-contain',
                extension.id === 'json-online' && 'dark:invert',
              )}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xl font-semibold tracking-tight">
            {t('new_pageTitle', { name: extension.name })}
          </span>
          <DatasourceDocsLink docsUrl={extension.docsUrl ?? null} />
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {t('nameLabel')}
        </span>
        {isEditingName ? (
          <>
            <Input
              autoFocus
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              autoComplete="off"
              className="bg-muted/40 h-8 min-w-[120px] flex-1 rounded-md border-0 px-2 text-base font-medium shadow-none"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={handleNameSave}
              aria-label={t('confirmName', { defaultValue: 'Save name' })}
            >
              <Check className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-foreground min-w-0 truncate text-base font-medium">
              {name || t('untitled', { defaultValue: 'Untitled' })}
            </span>
            {onRandomizeName && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-8 w-8 shrink-0"
                onClick={onRandomizeName}
                aria-label={t('randomizeName', {
                  defaultValue: 'Randomize name',
                })}
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-8 w-8 shrink-0"
              onClick={() => setIsEditingName(true)}
              aria-label={t('editNameAriaLabel')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  ) : null;

  const fieldsEl = isSchemaLoading ? (
    <div className="flex min-h-[200px] items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  ) : (
    <FormRenderer
      // `key` forces FormRenderer to remount when the schema identity
      // changes so react-hook-form re-inits its default values against
      // the new shape. Without this, switching providers mid-session
      // leaves stale values in the form state.
      key={extension.id}
      schema={effectiveSchema}
      onSubmit={() => {}}
      formId="datasource-form"
      locale={i18n.resolvedLanguage}
      onFormReady={(values) => setFormValues(values as Record<string, unknown>)}
      onValidityChange={setIsFormValid}
    />
  );

  const actionsEl = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={isPending}
        className="text-muted-foreground hover:text-foreground"
      >
        {t('cancel')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleTest}
        disabled={isPending || isSchemaLoading || !isFormValid || !formValues}
      >
        {isTesting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {isTesting ? t('testing') : t('testConnection')}
      </Button>
      <Button
        size="sm"
        onClick={handleConnect}
        disabled={isPending || isSchemaLoading || !isFormValid || !formValues}
      >
        {isConnecting ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Check className="mr-2 size-4" />
        )}
        {isConnecting ? t('connecting') : t('connect')}
      </Button>
    </div>
  );

  if (variant === 'sheet') {
    // Sheet variant: flex-col-h-full with sticky footer. The scrollable body
    // only contains the fields — header and actions stay fixed so the buttons
    // can't be pushed out of view on tall forms.
    return (
      <div className={cn('flex h-full flex-col', className)}>
        {headerEl}
        <section className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {fieldsEl}
        </section>
        <div className="bg-background shrink-0 border-t px-6 py-4">
          {actionsEl}
        </div>
      </div>
    );
  }

  // Default variant: simple column layout, scrolls with the parent page.
  return (
    <div className={cn('mx-auto max-w-3xl space-y-8', className)}>
      {headerEl}
      <section className="px-4 py-4">{fieldsEl}</section>
      <div className="px-4 pt-4">{actionsEl}</div>
    </div>
  );
}
