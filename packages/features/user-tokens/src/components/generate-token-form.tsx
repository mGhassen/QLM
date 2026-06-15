import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { type UserTokenScope } from '@qlm/domain/entities';
import {
  CreateUserTokenInputSchema,
  type CreateUserTokenInput,
  type CreateUserTokenOutput,
} from '@qlm/domain/usecases';
import { useMarkSectionDirty } from '@qlm/settings-shell';
import { Alert, AlertDescription } from '@qlm/ui/alert';
import { Button } from '@qlm/ui/button';
import { Checkbox } from '@qlm/ui/checkbox';
import { Input } from '@qlm/ui/input';
import { Label } from '@qlm/ui/label';

import { useCreateUserTokenMutation } from '../hooks/use-create-user-token-mutation';

export type GenerateTokenFormProps = {
  onCancel: () => void;
  onCreated: (output: CreateUserTokenOutput) => void;
};

const SCOPE_OPTIONS: ReadonlyArray<UserTokenScope> = ['read', 'write', 'admin'];

function defaultExpiresAt(): number {
  const NINETY_DAYS_SECONDS = 90 * 86_400;
  return Math.floor(Date.now() / 1000) + NINETY_DAYS_SECONDS;
}

function unixToDateInputValue(unix: number): string {
  return format(new Date(unix * 1000), 'yyyy-MM-dd');
}

function dateInputValueToUnix(value: string): number {
  // `<input type="date">` returns `YYYY-MM-DD` in local TZ; treat as
  // end-of-day local so the token is valid through the chosen calendar day.
  const parsed = new Date(`${value}T23:59:59`);
  return Math.floor(parsed.getTime() / 1000);
}

/**
 * "create" pane state — inline form. Submit pipes through
 * `useCreateUserTokenMutation`; on success emits
 * `onCreated({ row, rawJwt })` so the parent reducer transitions to the
 * `reveal` state.
 *
 * Marks the surrounding settings-shell section dirty when the form is
 * touched so the discard guard fires if the user closes the dialog
 * mid-flight.
 */
export function GenerateTokenForm({
  onCancel,
  onCreated,
}: Readonly<GenerateTokenFormProps>) {
  const { t } = useTranslation('tokens');
  const markDirty = useMarkSectionDirty('personal-tokens');
  const mutation = useCreateUserTokenMutation();

  const form = useForm<CreateUserTokenInput>({
    resolver: zodResolver(CreateUserTokenInputSchema),
    mode: 'onChange',
    defaultValues: {
      token_name: '',
      scopes: [],
      expires_at: defaultExpiresAt(),
    },
  });

  const { isDirty, isValid } = form.formState;

  useEffect(() => {
    markDirty(isDirty);
    return () => markDirty(false);
  }, [isDirty, markDirty]);

  async function onSubmit(input: CreateUserTokenInput) {
    try {
      const result = await mutation.mutateAsync(input);
      onCreated(result);
    } catch {
      // The error is already surfaced via `mutation.error` and rendered
      // in the inline alert above — swallow here so React-Query's
      // mutateAsync rejection doesn't bubble up as unhandled.
    }
  }

  const errorMessage =
    mutation.error instanceof Error ? mutation.error.message : null;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-xs"
        onClick={onCancel}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('pane.create.back')}
      </button>

      <header className="flex flex-col gap-1">
        <h2 className="text-foreground text-lg font-semibold">
          {t('pane.create.title')}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('pane.create.subtitle')}
        </p>
      </header>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="token-name">{t('pane.create.nameLabel')}</Label>
          <Input
            id="token-name"
            placeholder={t('pane.create.namePlaceholder')}
            {...form.register('token_name')}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t('pane.create.scopesLabel')}</Label>
          <Controller
            control={form.control}
            name="scopes"
            render={({ field }) => (
              <ul className="flex flex-col gap-2">
                {SCOPE_OPTIONS.map((scope) => {
                  const checked = field.value?.includes(scope) ?? false;
                  const id = `scope-${scope}`;
                  return (
                    <li key={scope}>
                      <label
                        htmlFor={id}
                        className="hover:bg-accent flex cursor-pointer items-start gap-2 rounded-sm p-2 text-sm"
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={(next) => {
                            const set = new Set(field.value ?? []);
                            if (next) set.add(scope);
                            else set.delete(scope);
                            const ordered = SCOPE_OPTIONS.filter((s) =>
                              set.has(s),
                            );
                            field.onChange(ordered);
                          }}
                        />
                        <span className="flex flex-col">
                          <span className="font-medium">
                            {t(`scopes.${scope}`)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {t(`scopes.${scope}Help`)}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="token-expiration">
            {t('pane.create.expiresLabel')}
          </Label>
          <Controller
            control={form.control}
            name="expires_at"
            render={({ field }) => (
              <Input
                id="token-expiration"
                type="date"
                value={unixToDateInputValue(field.value)}
                onChange={(event) =>
                  field.onChange(dateInputValueToUnix(event.target.value))
                }
              />
            )}
          />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={mutation.isPending}
          >
            {t('pane.create.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={!isValid || mutation.isPending}
            data-test="generate-token-submit"
          >
            {t('pane.create.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
