import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

import { useShell, useShellApp } from '@qlm/shell-runtime';
import { Button } from '@qlm/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@qlm/ui/form';
import { Input } from '@qlm/ui/input';

const schema = z.object({
  name: z.string().min(1).max(255),
});

type FormValues = z.infer<typeof schema>;

export function ProjectSettingsGeneralSection() {
  const { t } = useTranslation('project-settings');
  const shell = useShell();
  const { currentUserId } = useShellApp();

  const projectQuery = useQuery({
    queryKey: shell.projects.keys.bySlug(shell.projectSlug),
    queryFn: () => shell.projects.getBySlug(shell.projectSlug),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (projectQuery.data) {
      form.reset({ name: projectQuery.data.name });
    }
  }, [projectQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!projectQuery.data) {
        throw new Error('Project not loaded');
      }
      return shell.projects.update({
        id: projectQuery.data.id,
        name: values.name,
        updatedBy: currentUserId,
      });
    },
    onSuccess: async (updated) => {
      toast.success(t('sections.general.saved'));
      await Promise.all([
        shell.projects.invalidate.detail(updated.id),
        shell.projects.invalidate.all(),
      ]);
    },
    onError: () => {
      toast.error(t('sections.general.error.saveFailed'));
    },
  });

  if (projectQuery.isPending) {
    return (
      <div className="text-muted-foreground p-6 text-sm">
        {t('sections.general.loading')}
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
            >
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
