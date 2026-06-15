import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  AlertTriangle,
  CircleStop,
  Cpu,
  Database,
  Droplets,
  FileCode,
  Globe,
  Layers,
  Loader2,
  Network,
  Pencil,
  Play,
  Server,
  Tag,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { ActionFooter, type Action } from '@qlm/ui/action';
import { Button } from '@qlm/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@qlm/ui/form';
import { FormLabel } from '@qlm/ui/form';
import { Input } from '@qlm/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qlm/ui/select';
import { Skeleton } from '@qlm/ui/skeleton';
import { cn } from '@qlm/ui/utils';
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetFooter,
  EntitySheetHeader,
} from '@qlm/ui/entity-sheet';
import {
  BadgeItem,
  DataRow,
  EntitySection,
  ResourceCard,
} from '@qlm/ui/entity-primitives';
import {
  INPUT_CLASS,
  LABEL_CLASS,
  MESSAGE_CLASS,
  SELECT_TRIGGER_CLASS,
  TagInput,
} from '@qlm/ui/form-primitives';

import {
  NODE_KINDS,
  NODE_LIFECYCLE_STATES,
  NODE_PROVIDERS,
  NODE_REGIONS,
  type Node,
  type NodeLifecycleState,
  type NodeProvider,
} from '@qlm/domain/entities';
import type { UpdateNodeInput } from '@qlm/domain/usecases';
import { useShell } from '@qlm/shell-runtime';
import { useQuery } from '@tanstack/react-query';

const SUGGESTED_TAGS = ['production', 'staging', 'gpu', 'critical'];

import { HealthStatusBadge } from '../cells/health-status-badge';
import { MetricsSparkline } from './metrics-sparkline';
import { ProviderIcon } from '../cells/provider-icon';
import { DISPLAY_BADGE_CLASSES, PROVIDER_STYLES } from '../../application/constants';
import { buildFooterActions } from '../../application/use-actions';
import { getNodeDisplayState } from '../lib/get-node-display-state';

const EditNodeSchema = z.object({
  name: z.string().min(1).max(255),
  lifecycle: z.enum(NODE_LIFECYCLE_STATES),
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

type EditNodeForm = z.infer<typeof EditNodeSchema>;

export type DetailsSheetProps = Readonly<{
  nodeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => Promise<void> | void;
  onUpdate?: (input: UpdateNodeInput) => Promise<void> | void;
  onSetLifecycle?: (id: string, lifecycle: NodeLifecycleState) => Promise<void> | void;
  onDrain?: (node: Node) => void;
  onCancelDrain?: (id: string) => Promise<void> | void;
  onTagClick?: (tag: string) => void;
}>;

export function DetailsSheet({
  nodeId,
  open,
  onOpenChange,
  onDelete,
  onUpdate,
  onSetLifecycle,
  onDrain,
  onCancelDrain,
  onTagClick,
}: DetailsSheetProps) {
  const { t } = useTranslation('nodes');
  const shell = useShell();
  const {
    data: node,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: shell.nodes.keys.detail(nodeId ?? ''),
    queryFn: () => shell.nodes.get(nodeId!),
    enabled: !!nodeId,
  });
  const [editing, setEditing] = useState(false);

  const editForm = useForm<EditNodeForm, unknown, EditNodeForm>({
    resolver: zodResolver(EditNodeSchema),
    defaultValues: {
      name: '',
      lifecycle: 'active',
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

  const startEdit = () => {
    if (!node) return;
    if (!node.lifecycle) {
      throw new Error(
        `Node ${node.id} has no lifecycle — adapters must populate the 5-axis state. RFC 0026 §3 G2.`,
      );
    }
    editForm.reset({
      name: node.name,
      lifecycle: node.lifecycle,
      kind: node.kind,
      region: node.region,
      cpuCores: node.cpuCores,
      memoryGb: node.memoryGb,
      provider: node.provider,
      cluster: node.cluster ?? '',
      ip: node.ip ?? '',
      owner: node.owner ?? '',
      tags: [...node.tags],
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    editForm.reset();
    setEditing(false);
  };

  const submitEdit = async (values: EditNodeForm) => {
    if (!node || !onUpdate) return;
    try {
      await onUpdate({
        id: node.id,
        ...values,
        cluster: values.cluster || undefined,
        ip: values.ip || undefined,
        owner: values.owner || undefined,
      });
      toast.success(t('success'));
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('failed'));
    }
  };


  const footerActions = buildFooterActions({
    t,
    onEdit: () => startEdit(),
    onDelete: async (n) => {
      await onDelete(n.id);
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEditing(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <>
      <EntitySheet open={open} onOpenChange={handleOpenChange} size="details">
        {isLoading ? (
          <div className="flex-1">
            <DetailsSkeleton />
          </div>
        ) : isError ? (
          <div className="flex-1 px-8 py-10 flex flex-col items-center justify-center text-center">
            <div className="h-14 w-14 rounded-none bg-destructive/10 flex items-center justify-center mb-4 border border-destructive/20">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <h3 className="text-base font-bold tracking-tight mb-2">{t('errorTitle')}</h3>
            <p className="text-muted-foreground text-[11px] font-bold tracking-tight mb-6 max-w-[240px] uppercase opacity-60">
              {t('description')}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-none border font-bold tracking-tight text-[11px] h-10 px-6 cursor-pointer">
              <Loader2 className="mr-2 h-4 w-4" />
              {t('retry')}
            </Button>
          </div>
        ) : !node ? (
          <div className="flex-1 flex items-center justify-center p-8 text-sm font-bold tracking-tight text-muted-foreground uppercase opacity-40">
            {t('notFound')}
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* ── Hero Header ─────────────────────────── */}
            <EntitySheetHeader
              icon={<Server className="h-6 w-6" />}
              iconClassName={DISPLAY_BADGE_CLASSES[getNodeDisplayState(node).kind] ?? ''}
              title={node.name}
              meta={<HealthStatusBadge node={node} />}
              actions={
                <div className="flex items-center gap-1.5">
                  {(onSetLifecycle || onDrain || onCancelDrain) && (() => {
                    const isActive = node.lifecycle === 'active';
                    const isStopped = node.lifecycle === 'stopped';
                    const isDraining = Boolean(node.drain?.active);
                    return (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={isActive || isDraining}
                          onClick={() => onSetLifecycle?.(node.id, 'active')}
                          aria-label={t('actions.start')}
                          className="h-7 w-7 rounded-none border cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={!isActive || isDraining}
                          onClick={() => onDrain?.(node)}
                          aria-label={t('actions.drain')}
                          className="h-7 w-7 rounded-none border cursor-pointer"
                        >
                          <Droplets className="h-3.5 w-3.5" />
                        </Button>
                        {isDraining && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onCancelDrain?.(node.id)}
                            aria-label={t('actions.cancelDrain')}
                            className="h-7 w-7 rounded-none border cursor-pointer"
                          >
                            <Droplets className="h-3.5 w-3.5 line-through" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={isStopped}
                          onClick={() => onSetLifecycle?.(node.id, 'stopped')}
                          aria-label={t('actions.stop')}
                          className="h-7 w-7 rounded-none border cursor-pointer"
                        >
                          <CircleStop className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    );
                  })()}
                  <div className="w-px h-4 bg-border/50 mx-1" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      await navigator.clipboard.writeText(JSON.stringify(node, null, 2));
                      toast.success(t('jsonCopied'));
                    }}
                    aria-label={t('copyJson')}
                    className="h-7 w-7 rounded-none border cursor-pointer"
                  >
                    <FileCode className="h-3.5 w-3.5" />
                  </Button>
                </div>
              }
            />

            {/* ── Provider / Region / Kind badge row ── */}
            <div className="flex flex-wrap gap-1.5 px-8 py-4 bg-muted/10">
              {node.provider && (() => {
                const p = PROVIDER_STYLES[node.provider];
                return (
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-none px-2.5 py-1 border bg-background',
                      p.text,
                    )}
                  >
                    <ProviderIcon provider={node.provider} size={11} />
                    <span className="text-[10px] font-bold tracking-tight uppercase">
                      {t(`provider.${node.provider}`)}
                    </span>
                  </div>
                );
              })()}
              <BadgeItem icon={<Globe className="h-3 w-3" />} label={node.region} />
              <BadgeItem icon={<Layers className="h-3 w-3" />} label={node.kind} />
            </div>

            {/* ── Content ────────────────────────────── */}
            <EntitySheetBody>
              {editing ? (
                <Form {...editForm}>
                  <form
                    id="node-edit-form"
                    autoComplete="off"
                    onSubmit={editForm.handleSubmit(submitEdit)}
                    className="px-8 py-8 space-y-6"
                  >
                    {/* Name */}
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className={LABEL_CLASS}>{t('edit.field.name')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className={INPUT_CLASS}
                              autoComplete="off"
                              autoFocus
                            />
                          </FormControl>
                          <FormMessage className={MESSAGE_CLASS} />
                        </FormItem>
                      )}
                    />

                    {/* Lifecycle */}
                    <FormField
                      control={editForm.control}
                      name="lifecycle"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className={LABEL_CLASS}>{t('col.lifecycle')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-none border shadow-xl">
                              {NODE_LIFECYCLE_STATES.map((s: NodeLifecycleState) => (
                                <SelectItem key={s} value={s} className="font-bold text-[13px] tracking-tight py-2.5 cursor-pointer">
                                  {t(`lifecycle.${s}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className={MESSAGE_CLASS} />
                        </FormItem>
                      )}
                    />

                    {/* Kind + Region */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="kind"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className={LABEL_CLASS}>{t('edit.field.kind')}</FormLabel>
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
                        control={editForm.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className={LABEL_CLASS}>{t('edit.field.region')}</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-none border shadow-xl">
                                {NODE_REGIONS.map((r) => (
                                  <SelectItem key={r} value={r} className="font-bold text-[13px] tracking-tight py-2.5 cursor-pointer font-mono">
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className={MESSAGE_CLASS} />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* CPU + Memory */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="cpuCores"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className={cn(LABEL_CLASS, 'flex items-center gap-1.5')}>
                              <Cpu className="h-3.5 w-3.5" />
                              {t('edit.field.cpu')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                placeholder={t('cpuPlaceholder')}
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
                        control={editForm.control}
                        name="memoryGb"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className={cn(LABEL_CLASS, 'flex items-center gap-1.5')}>
                              <Database className="h-3.5 w-3.5" />
                              {t('edit.field.memory')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0.5}
                                step={0.5}
                                placeholder={t('memoryPlaceholder')}
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

                    <div className="border-t border-border/50 pt-1" />

                    {/* Provider + Owner */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="provider"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className={LABEL_CLASS}>{t('edit.field.provider')}</FormLabel>
                            <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                              <FormControl>
                                <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                                  <SelectValue placeholder={t('none')} />
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
                        control={editForm.control}
                        name="owner"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className={LABEL_CLASS}>{t('edit.field.owner')}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t('ownerPlaceholder')}
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
                        control={editForm.control}
                        name="cluster"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className={LABEL_CLASS}>{t('edit.field.cluster')}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t('clusterPlaceholder')}
                                className={cn(INPUT_CLASS, 'font-mono')}
                                autoComplete="off"
                              />
                            </FormControl>
                            <FormMessage className={MESSAGE_CLASS} />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
                        name="ip"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className={LABEL_CLASS}>{t('edit.field.ip')}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t('ipPlaceholder')}
                                className={cn(INPUT_CLASS, 'font-mono')}
                                autoComplete="off"
                              />
                            </FormControl>
                            <FormMessage className={MESSAGE_CLASS} />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Tags */}
                    <FormField
                      control={editForm.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className={LABEL_CLASS}>{t('edit.field.tags')}</FormLabel>
                          <FormControl>
                            <TagInput
                              tags={field.value}
                              onChange={field.onChange}
                              placeholder={t('edit.field.tagsPlaceholder')}
                              suggestions={SUGGESTED_TAGS}
                              className="bg-background/80"
                            />
                          </FormControl>
                          <FormMessage className={MESSAGE_CLASS} />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              ) : (
                <div className="flex flex-col gap-6 px-8 py-6">
                  {/* Resources Section */}
                  <section className="grid grid-cols-2 gap-4">
                    <ResourceCard
                      label={t('cpu')}
                      value={node.cpuCores}
                      unit={t('vcpu')}
                      icon={<Cpu className="h-3 w-3" />}
                    />
                    <ResourceCard
                      label={t('memory')}
                      value={node.memoryGb}
                      unit={t('gb')}
                      icon={<Database className="h-3 w-3" />}
                    />
                  </section>

                  {/* Content Sections */}
                  <div className="flex flex-col gap-6">
                    <EntitySection title={t('infrastructure')}>
                      <div className="grid gap-2.5">
                        <DataRow
                          icon={<Globe className="h-3 w-3" />}
                          label={t('col.provider')}
                          value={node.provider ? t(`provider.${node.provider}`) : t('common.none')}
                        />
                        <DataRow icon={<Layers className="h-3 w-3" />} label={t('col.cluster')} value={node.cluster} mono />
                        <DataRow icon={<Network className="h-3 w-3" />} label={t('col.ip')} value={node.ip} mono />
                      </div>
                    </EntitySection>

                    <EntitySection title={t('details.section.metrics')}>
                      <MetricsSparkline nodeId={node.id} />
                    </EntitySection>

                    <EntitySection title={t('col.tags')}>
                      {node.tags.length === 0 ? (
                        <p className="text-muted-foreground text-[10px] font-bold tracking-tight uppercase opacity-40 px-1 italic">{t('details.noTags')}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 px-1">
                          {node.tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => onTagClick?.(tag)}
                              className="group flex items-center gap-1.5 bg-muted/60 border border-border px-2.5 py-1.5 rounded-none text-[10px] font-bold tracking-tight uppercase hover:bg-foreground hover:text-background hover:border-foreground transition-all cursor-pointer"
                            >
                              <Tag className="h-2 w-2 opacity-60 group-hover:opacity-100" />
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </EntitySection>
                  </div>
                </div>
              )}
            </EntitySheetBody>

            {/* ── Footer ─────────────────────────────── */}
            <EntitySheetFooter>
              {editing ? (
                <div className="flex gap-2.5">
                  <Button
                    form="node-edit-form"
                    type="submit"
                    className="flex-1 rounded-none h-11 font-bold tracking-tight text-[13px] cursor-pointer"
                    disabled={editForm.formState.isSubmitting}
                  >
                    {editForm.formState.isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : t('submit')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-none h-11 font-bold tracking-tight text-[13px] border cursor-pointer"
                    onClick={cancelEdit}
                  >
                    {t('cancel')}
                  </Button>
                </div>
              ) : (
                <ActionFooter actions={footerActions} ctx={node} />
              )}
            </EntitySheetFooter>
          </div>
        )}
      </EntitySheet>
    </>
  );
}

function DetailsSkeleton() {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-6 pt-8 pb-6 flex flex-col gap-5 border-b border-border bg-muted/5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-none border" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-1/2 rounded-none" />
            <Skeleton className="h-4 w-1/3 rounded-none" />
          </div>
        </div>
      </div>
      <div className="px-6 grid grid-cols-2 gap-4 mt-6">
        <Skeleton className="h-28 rounded-none border" />
        <Skeleton className="h-28 rounded-none border" />
      </div>
      <div className="px-6 mt-10 space-y-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-6">
            <Skeleton className="h-4 w-28 rounded-none" />
            <Skeleton className="h-5 w-full rounded-none" />
            <Skeleton className="h-5 w-5/6 rounded-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
