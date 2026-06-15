import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

import { useShell, useShellApp } from '@qlm/shell-runtime';
import { Button } from '@qlm/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@qlm/ui/form';
import { Input } from '@qlm/ui/input';
import { Switch } from '@qlm/ui/switch';

const schema = z.object({
  name: z.string().min(1).max(255),
  hideSidebar: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function OrgSettingsGeneralSection() {
  const { t } = useTranslation('org-settings');
  const shell = useShell();
  const { currentUserId } = useShellApp();
  const queryClient = useQueryClient();

  const orgQuery = useQuery({
    queryKey: shell.organizations.keys.detail(shell.orgSlug),
    queryFn: () => shell.organizations.getBySlug(shell.orgSlug),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', hideSidebar: false },
  });

  useEffect(() => {
    if (orgQuery.data) {
      form.reset({
        name: orgQuery.data.name,
        hideSidebar: orgQuery.data.hideSidebar,
      });
    }
  }, [orgQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!orgQuery.data) {
        throw new Error('Organization not loaded');
      }
      return shell.organizations.update({
        id: orgQuery.data.id,
        name: values.name,
        hideSidebar: values.hideSidebar,
        updatedBy: currentUserId,
      });
    },
    onSuccess: async () => {
      toast.success(t('sections.general.saved'));
      await Promise.all([
        shell.organizations.invalidate.detail(shell.orgSlug),
        shell.organizations.invalidate.all(),
        queryClient.invalidateQueries({
          queryKey: ['organization-by-id', orgQuery.data!.id],
        }),
      ]);
    },
    onError: () => {
      toast.error(t('sections.general.error.saveFailed'));
    },
  });

  if (orgQuery.isPending) {
    return (
      <div className="text-muted-foreground p-6 text-sm">
        {t('sections.general.loading')}
      </div>
    );
  }

  if (orgQuery.isError || !orgQuery.data) {
    return (
      <div className="text-destructive p-6 text-sm">
        {t('sections.general.error.loadFailed')}
      </div>
    );
  }

  const isSubmitting = updateMutation.isPending;
  const isDirty = form.formState.isDirty;

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('sections.general.title')}
        </h2>
      </header>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
          className="space-y-5"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('sections.general.fields.name')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} autoComplete="off" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hideSidebar"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>
                    {t('sections.general.fields.hideSidebar.label')}
                  </FormLabel>
                  <FormDescription>
                    {t('sections.general.fields.hideSidebar.description')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting
                ? t('sections.general.saving')
                : t('sections.general.save')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
