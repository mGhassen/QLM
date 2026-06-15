import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { Building2, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Organization } from '@guepard/domain/entities';
import { useUser } from '@guepard/supabase/hooks/use-user';
import { Button } from '@guepard/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@guepard/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@guepard/ui/form';
import { Input } from '@guepard/ui/input';
import { Trans } from '@guepard/ui/trans';
import { cn } from '@guepard/ui/utils';

import { useWorkspace } from '@/lib/context/workspace-context';
import pathsConfig from '@/config/paths.config';
import {
  useCreateOrganization,
  useUpdateOrganization,
} from '@/lib/mutations/use-organization';

const organizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface OrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Organization | null;
  onSuccess?: () => void;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error) {
    return error;
  }
  return fallback;
}

export function OrganizationDialog({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: Readonly<OrganizationDialogProps>) {
  const { t } = useTranslation();
  const { repositories } = useWorkspace();
  const user = useUser();
  const navigate = useNavigate();
  const isEditing = !!organization;
  const userId = user.data?.sub ?? 'system';

  const createMutation = useCreateOrganization(repositories.organization, {
    onSuccess: (created) => {
      toast.success(t('organizations:create_success'));
      onOpenChange(false);
      onSuccess?.();
      if (created?.slug) {
        // The `LastProjectRedirect` at `/` picks up the freshly-created org
        // once the list query refreshes and lands the user on its first
        // project. Story 008's topbar dropdown will surface a direct switcher.
        void navigate({ to: pathsConfig.app.home });
      }
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('organizations:create_error')));
    },
  });

  const updateMutation = useUpdateOrganization(repositories.organization, {
    onSuccess: () => {
      toast.success('Organization updated successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to update organization'));
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: organization?.name ?? '' });
    }
  }, [open, organization, form]);

  const onSubmit = (data: OrganizationFormData) => {
    if (isEditing && organization) {
      updateMutation.mutate({
        id: organization.id,
        name: data.name,
        updatedBy: userId,
      });
    } else {
      createMutation.mutate({
        name: data.name,
        userId,
        createdBy: userId,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-4 pb-1">
          <div className="flex items-start gap-4">
            <div className="bg-primary/20 text-primary ring-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1">
              {isEditing ? (
                <Building2 className="h-6 w-6" />
              ) : (
                <Sparkles className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1 space-y-1.5 pt-0.5">
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                <Trans
                  i18nKey={
                    isEditing
                      ? 'organizations:edit_organization'
                      : 'organizations:create_organization'
                  }
                />
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                <Trans
                  i18nKey={
                    isEditing
                      ? 'organizations:edit_organization_description'
                      : 'organizations:create_organization_description'
                  }
                />
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            data-test="create-organization-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2.5">
                  <FormLabel className="text-sm font-medium">
                    <Trans i18nKey="organizations:name" />
                    <span className="text-destructive ml-1.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-test="create-organization-name-input"
                      placeholder={t('organizations:name_placeholder')}
                      disabled={isSubmitting}
                      className={cn(
                        'h-11',
                        form.formState.errors.name &&
                          'border-destructive focus-visible:ring-destructive focus-visible:ring-2',
                      )}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-3 pt-4 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-11 min-w-[100px]"
              >
                <Trans i18nKey="common:cancel" />
              </Button>
              <Button
                data-test="confirm-create-organization-button"
                type="submit"
                disabled={isSubmitting}
                className="h-11 min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <Trans i18nKey="common:saving" />
                  </>
                ) : isEditing ? (
                  <Trans i18nKey="common:update" />
                ) : (
                  <Trans i18nKey="common:create" />
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
