import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Cpu, Database, Loader2, Plus } from 'lucide-react';
import { toast } from '@guepard/ui/sonner';
import { z } from 'zod';

import { Button } from '@guepard/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@guepard/ui/form';
import { Input } from '@guepard/ui/input';
import { FormLabel, FormMessage } from '@guepard/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@guepard/ui/select';
import { UnifiedSelector } from '@guepard/ui/unified-selector';
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetFooter,
  EntitySheetHeader,
} from '@guepard/ui/entity-sheet';
import { cn } from '@guepard/ui/utils';
import {
  INPUT_CLASS,
  LABEL_CLASS,
  MESSAGE_CLASS,
  SELECT_TRIGGER_CLASS,
  TagInput,
} from '@guepard/ui/form-primitives';

import {
  NODE_KINDS,
  NODE_PROVIDERS,
  NODE_REGIONS,
} from '@guepard/domain/entities';
import type { CreateNodeInput as DomainCreateNodeInput } from '@guepard/domain/usecases';

export type CreateNodeInput = Omit<DomainCreateNodeInput, 'projectId'>;

const SUGGESTED_TAGS = ['production', 'staging', 'gpu', 'critical'];

const REGION_ITEMS = NODE_REGIONS.map((region) => ({
  id: region,
  name: region,
  code: region,
}));

const CreateNodeSchema = z.object({
  name: z.string().min(1).max(255),
  kind: z.enum(NODE_KINDS),
  region: z.enum(NODE_REGIONS),
  cpuCores: z.number().int().min(1),
  memoryGb: z.number().min(0.5),
  provider: z.enum(NODE_PROVIDERS).optional(),
  cluster: z.string().optional(),
  ip: z.string().optional(),
  owner: z.string().optional(),
  tags: z.array(z.string()),
});

type CreateNodeForm = z.infer<typeof CreateNodeSchema>;

export type CreateSheetProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateNodeInput) => Promise<void>;
}>;

export function CreateSheet({
  open,
  onOpenChange,
  onCreate,
}: CreateSheetProps) {
  const { t } = useTranslation('nodes');

  const form = useForm<CreateNodeForm, unknown, CreateNodeForm>({
    resolver: zodResolver(CreateNodeSchema),
    defaultValues: {
      name: '',
      kind: 'standard-4',
      region: 'us-east-1',
      cpuCores: 4,
      memoryGb: 16,
      provider: undefined,
      cluster: '',
      ip: '',
      owner: '',
      tags: [],
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const handleClose = () => {
    if (isSubmitting) return;
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (values: CreateNodeForm) => {
    try {
      await onCreate({
        ...values,
        cluster: values.cluster || undefined,
        ip: values.ip || undefined,
        owner: values.owner || undefined,
      });
      toast.success(t('success'));
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('failed'));
    }
  };

  return (
    <EntitySheet open={open} onOpenChange={handleClose} size="create">
      <EntitySheetHeader
        icon={<Plus className="h-6 w-6 text-primary" />}
        title={t('create.title')}
        description={t('create.description')}
      />
      <EntitySheetBody>
        <Form {...form}>
          <form
            id="node-create-form"
            autoComplete="off"
            onSubmit={form.handleSubmit(onSubmit)}
            className="px-8 py-8 space-y-6"
          >
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className={LABEL_CLASS}>
                    {t('create.field.name')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('create.field.namePlaceholder')}
                      className={INPUT_CLASS}
                      autoComplete="off"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage className={MESSAGE_CLASS} />
                </FormItem>
              )}
            />

            {/* Kind + Region */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className={LABEL_CLASS}>
                      {t('create.field.kind')}
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-none border shadow-xl">
                        {NODE_KINDS.map((k) => (
                          <SelectItem key={k} value={k} className="font-bold text-[13px] tracking-tight py-2.5 cursor-pointer">
                            {t(`kind.${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className={MESSAGE_CLASS} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className={LABEL_CLASS}>
                      {t('create.field.region')}
                    </FormLabel>
                    <FormControl>
                      <UnifiedSelector
                        mode="single"
                        items={REGION_ITEMS}
                        selectedId={field.value}
                        onSelect={(item) => field.onChange(item.id)}
                        placeholder={t('region')}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage className={MESSAGE_CLASS} />
                  </FormItem>
                )}
              />
            </div>

            {/* CPU + Memory */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpuCores"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className={cn(LABEL_CLASS, 'flex items-center gap-1.5')}>
                      <Cpu className="h-3.5 w-3.5" />
                      {t('create.field.cpu')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder={t('create.field.cpuPlaceholder')}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        autoComplete="off"
                        className={cn(INPUT_CLASS, '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none')}
                      />
                    </FormControl>
                    <FormMessage className={MESSAGE_CLASS} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="memoryGb"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className={cn(LABEL_CLASS, 'flex items-center gap-1.5')}>
                      <Database className="h-3.5 w-3.5" />
                      {t('create.field.memory')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0.5}
                        step={0.5}
                        placeholder={t('create.field.memoryPlaceholder')}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        autoComplete="off"
                        className={cn(INPUT_CLASS, '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none')}
                      />
                    </FormControl>
                    <FormMessage className={MESSAGE_CLASS} />
                  </FormItem>
                )}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-border/50 pt-1" />

            {/* Provider + Owner */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className={LABEL_CLASS}>
                      {t('create.field.provider')}
                    </FormLabel>
                    <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                      <FormControl>
                        <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                          <SelectValue placeholder={t('common.none')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-none border shadow-xl">
                        {NODE_PROVIDERS.map((p) => (
                          <SelectItem key={p} value={p} className="font-bold text-[13px] tracking-tight py-2.5 cursor-pointer">
                            {t(`provider.${p}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className={MESSAGE_CLASS} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className={LABEL_CLASS}>
                      {t('create.field.owner')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('create.field.ownerPlaceholder')}
                        className={INPUT_CLASS}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage className={MESSAGE_CLASS} />
                  </FormItem>
                )}
              />
            </div>

            {/* Cluster + IP */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cluster"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className={LABEL_CLASS}>
                      {t('create.field.cluster')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('create.field.clusterPlaceholder')}
                        className={cn(INPUT_CLASS, 'font-mono')}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage className={MESSAGE_CLASS} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ip"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className={LABEL_CLASS}>
                      {t('create.field.ip')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('create.field.ipPlaceholder')}
                        className={cn(INPUT_CLASS, 'font-mono')}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage className={MESSAGE_CLASS} />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className={LABEL_CLASS}>
                    {t('create.field.tags')}
                  </FormLabel>
                  <FormControl>
                    <TagInput
                      tags={field.value}
                      onChange={field.onChange}
                      placeholder={t('create.field.tagsPlaceholder')}
                      suggestions={SUGGESTED_TAGS}
                    />
                  </FormControl>
                  <FormMessage className={MESSAGE_CLASS} />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </EntitySheetBody>

      <EntitySheetFooter>
        <div className="flex gap-2.5">
          <Button
            form="node-create-form"
            type="submit"
            className="flex-1 rounded-none h-11 font-bold tracking-tight text-[13px] cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('create.creating')}
              </>
            ) : (
              t('create.submit')
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-none h-11 font-bold tracking-tight text-[13px] border cursor-pointer"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t('create.cancel')}
          </Button>
        </div>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
