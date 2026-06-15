import { memo, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import {
  Activity,
  ArrowLeft,
  Check,
  ChevronRight,
  CircleStop,
  Copy,
  Cpu,
  Database,
  Droplets,
  HardDrive,
  Network,
  Play,
  Server,
  Tag,
  Trash2,
  Cloud,
  ExternalLink,
  FileCode,
} from 'lucide-react';

import type { Node, NodeLifecycleState } from '@qlm/domain/entities';
import { Button } from '@qlm/ui/button';
import { CloudProviderIcon } from '@qlm/ui/cloud-provider-icon';
import { ConfirmNameDialog } from '@qlm/ui/dialog-primitives';
import { BadgeItem, EntitySection } from '@qlm/ui/entity-primitives';
import { cn } from '@qlm/ui/utils';

import { DISPLAY_BADGE_CLASSES, PROVIDER_STYLES } from '../../application/constants';
import { HealthStatusBadge } from '../cells/health-status-badge';
import { getNodeDisplayState } from '../lib/get-node-display-state';
import { LastSeenDot } from '../cells/last-seen-dot';
import { NodeDetailStorageSection } from './detail-storage-section';
import { NodeDetailServicesSection } from './detail-services-section';

export type DetailPageProps = Readonly<{
  node: Node;
  projectSlug?: string;
  onBack?: () => void;
  onSetLifecycle?: (id: string, lifecycle: NodeLifecycleState) => Promise<void> | void;
  onDrain?: (node: Node) => void;
  onCancelDrain?: (id: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}>;

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function DetailPageInner({
  node,
  projectSlug = 'default',
  onBack,
  onSetLifecycle,
  onDrain,
  onCancelDrain,
  onDelete,
}: DetailPageProps) {
  const { t } = useTranslation('nodes');
  const navigate = useNavigate();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const provider = node.provider;
  const providerStyle = provider ? PROVIDER_STYLES[provider] : undefined;
  const displayState = getNodeDisplayState(node);
  const heroTone = DISPLAY_BADGE_CLASSES[displayState.kind] ?? '';
  const isDraining = Boolean(node.drain?.active);
  const isActive = node.lifecycle === 'active';
  const isStopped = node.lifecycle === 'stopped';

  const cpuPct = node.cpuUtilPct;
  const memPct = node.memUtilPct;
  const diskPct = node.diskUtilPct;
  const diskGb = node.diskGb;

  const kindLabel = t(`kind.${node.kind}`, { defaultValue: node.kind });

  const copyNodeId = () => {
    void navigator.clipboard.writeText(node.id);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background selection:bg-primary/20 selection:text-primary relative overflow-hidden">
      {/* Global decorative elements */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/2 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/3 rounded-full blur-[80px] -ml-24 -mb-24 pointer-events-none" />

      <header className="shrink-0 border-b border-border bg-card/30 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-[1240px] mx-auto px-8">
          <nav aria-label="breadcrumb" className="flex items-center justify-between pt-5 pb-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!onBack}
                onClick={onBack}
                className={cn(
                  'rounded-none border border-transparent px-1.5 py-0.5 text-xs font-bold uppercase tracking-tight text-muted-foreground transition-all hover:text-primary hover:bg-primary/5',
                  onBack ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                {t('list.title')}
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-tight text-foreground/90 truncate min-w-0">
                {node.name}
              </span>
            </div>
          </nav>

          <div className="flex items-start gap-6 pt-4 pb-8">
            <div
              className={cn(
                'h-[110px] w-[110px] shrink-0 flex items-center justify-center border border-border bg-background shadow-sm transition-all hover:border-primary/50 group relative overflow-hidden',
                heroTone,
              )}
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              {provider ? (
                <CloudProviderIcon provider={provider} size={48} className="relative z-10" />
              ) : (
                <Server className="h-12 w-12 relative z-10" />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-5 pt-1">
              <div className="flex flex-col gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold uppercase tracking-tighter leading-none truncate underline decoration-primary/20 decoration-2 underline-offset-4">
                      {node.name}
                    </h1>
                    <HealthStatusBadge node={node} className="h-6 px-2 text-[10px] shrink-0" />
                  </div>
                </div>

                {(onSetLifecycle || onDrain || onCancelDrain || onDelete) && (
                  <div className="flex items-center gap-1 w-fit mt-1">
                    <ActionButton
                      icon={<Play className="h-3.5 w-3.5" />}
                      disabled={isActive || isDraining}
                      onClick={() => onSetLifecycle?.(node.id, 'active')}
                      title={t('actions.start')}
                      activeTone="text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/20"
                    />
                    <ActionButton
                      icon={<Droplets className="h-3.5 w-3.5" />}
                      disabled={!isActive || isDraining}
                      onClick={() => onDrain?.(node)}
                      title={t('actions.drain')}
                      activeTone="text-sky-500 hover:bg-sky-500/10 hover:border-sky-500/20"
                    />
                    {isDraining && (
                      <ActionButton
                        icon={<Droplets className="h-3.5 w-3.5 line-through" />}
                        onClick={() => onCancelDrain?.(node.id)}
                        title={t('actions.cancelDrain')}
                        activeTone="text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/20"
                      />
                    )}
                    <ActionButton
                      icon={<CircleStop className="h-3.5 w-3.5" />}
                      disabled={isStopped}
                      onClick={() => onSetLifecycle?.(node.id, 'stopped')}
                      title={t('actions.stop')}
                      activeTone="text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20"
                    />
                    <div className="mx-1 h-5 w-px bg-border/40" />
                    <ActionButton
                      icon={<FileCode className="h-3.5 w-3.5" />}
                      onClick={async () => {
                        await navigator.clipboard.writeText(JSON.stringify(node, null, 2));
                        // Assuming toast is available or using a simple alert/msg
                        // I'll skip the toast for now as it's not imported but I can add it
                      }}
                      title={t('copyJson')}
                      activeTone="hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                    />
                    <ActionButton
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => setDeleteConfirmOpen(true)}
                      title={t('actions.delete')}
                      activeTone="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-border/30">
              <HeroMetaItem
                label={t('col.provider')}
                value={provider ? t(`provider.${provider}`) : t('common.none')}
                icon={<Cloud className="h-3.5 w-3.5 opacity-70" />}
                className={provider && providerStyle ? providerStyle.text : undefined}
                docsUrl={
                  provider === 'aws'
                    ? 'https://aws.amazon.com/documentation/'
                    : provider === 'gcp'
                      ? 'https://cloud.google.com/docs'
                      : provider === 'azure'
                        ? 'https://learn.microsoft.com/en-us/azure/'
                        : undefined
                }
              />
              <HeroMetaItem
                label={t('col.region')}
                value={node.region ?? t('common.none')}
                icon={<Network className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                badge
                onNavigate={() => {
                  if (node.region) {
                    void navigate({
                      to: '/prj/$projectSlug/$routeBase',
                      params: { projectSlug, routeBase: 'performance-profiles' },
                      search: { region: node.region }
                    });
                  }
                }}
              />
              <HeroMetaItem
                label={t('col.cluster')}
                value={node.cluster ?? t('common.none')}
                icon={<Server className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                badge
                onNavigate={() => {
                  if (node.cluster) {
                    void navigate({
                      to: '/prj/$projectSlug/$routeBase',
                      params: { projectSlug, routeBase: 'infrastructure' },
                      search: { cluster: node.cluster }
                    });
                  }
                }}
              />
              <HeroMetaItem
                label={t('col.ip')}
                value={node.ip ?? t('common.none')}
                icon={<Activity className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                mono
                copyable={Boolean(node.ip)}
                copyAria={t('detail.copyField', { field: t('col.ip') })}
                copyAriaCopied={t('detail.copied')}
              />
              <HeroMetaItem
                label={t('col.lastSeen')}
                value={
                  node.lastSeenAt ? formatTimestamp(node.lastSeenAt) : t('col.lastSeenNever')
                }
                icon={<LastSeenDot lastSeenAt={node.lastSeenAt} className="h-2 w-2 hidden" />}
                className="hidden lg:flex"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] pointer-events-none" />

        <div className="max-w-[1240px] mx-auto px-8 py-10 flex flex-col gap-12 relative z-10">
          <EntitySection title={t('detail.summary.title')} className="mb-12">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <StatTile
                icon={<Cpu className="h-5 w-5" />}
                label={t('detail.cpu.utilization')}
                value={cpuPct !== undefined ? ((cpuPct * node.cpuCores) / 100).toFixed(1) : '0.0'}
                hint={`${t('units.vcpuCount', { count: node.cpuCores })}`}
                progress={cpuPct ?? 0}
              />
              <StatTile
                icon={<Database className="h-5 w-5" />}
                label={t('detail.memory.utilization')}
                value={memPct !== undefined ? ((memPct * node.memoryGb) / 100).toFixed(1) : '0.0'}
                hint={`${t('units.gbCount', { count: node.memoryGb })}`}
                progress={memPct ?? 0}
              />
              <StatTile
                icon={<HardDrive className="h-5 w-5" />}
                label={t('detail.summary.disk')}
                value={
                  diskPct !== undefined && diskGb !== undefined
                    ? ((diskPct * diskGb) / 100).toFixed(0)
                    : (diskGb !== undefined ? '0' : '—')
                }
                hint={diskGb !== undefined ? `${t('units.gbCount', { count: diskGb })}` : t('detail.summary.noDisk')}
                progress={diskPct ?? 0}
              />
            </div>
          </EntitySection>


          <div className="max-w-4xl flex flex-col gap-14">
            <NodeDetailStorageSection node={node} />
            <NodeDetailServicesSection node={node} />
          </div>
        </div>
      </div>

      {onDelete && (
        <ConfirmNameDialog
          open={deleteConfirmOpen}
          onOpenChange={(open) => !open && !isDeleting && setDeleteConfirmOpen(false)}
          title={t('details.deleteConfirmTitle')}
          description={t('details.deleteConfirmDescription', { name: node.name })}
          nameToConfirm={node.name}
          namePrompt={t('details.deleteNamePrompt')}
          cancelLabel={t('actions.cancel')}
          confirmLabel={t('details.deleteConfirm')}
          confirming={isDeleting}
          onConfirm={async () => {
            setIsDeleting(true);
            try {
              await onDelete(node.id);
            } finally {
              setIsDeleting(false);
              setDeleteConfirmOpen(false);
            }
          }}
        />
      )}
    </div>
  );
}

function ActionButton({
  icon,
  onClick,
  disabled,
  title,
  activeTone,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title: string;
  activeTone?: string;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn('h-8 w-8 rounded-none transition-all border border-border/40 hover:border-primary/40 bg-background/50', !disabled && activeTone)}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {icon}
    </Button>
  );
}

function HeroMetaItem({
  label,
  value,
  icon,
  className,
  mono,
  copyable,
  copyAria,
  copyAriaCopied,
  badge,
  onNavigate,
  docsUrl,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
  mono?: boolean;
  copyable?: boolean;
  copyAria?: string;
  copyAriaCopied?: string;
  badge?: boolean;
  onNavigate?: () => void;
  docsUrl?: string;
}) {
  const { t } = useTranslation('nodes');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!copyable) return;
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn('flex flex-col gap-2.5 px-6 py-5 min-w-0', className)}>
      <span className="text-[11px] font-extrabold uppercase tracking-tight text-foreground/80 flex items-center gap-2">
        {icon}
        {label}
      </span>
      <div className="flex items-center gap-1.5 min-w-0">
        {badge ? (
          <div className="flex items-center gap-1.5 group/spec">
            <span className="bg-primary/5 text-primary text-[11px] font-extrabold uppercase tracking-tight px-2 py-0.5 border border-primary/20">
              {value}
            </span>
            {onNavigate && (
              <button
                type="button"
                onClick={onNavigate}
                className="p-1 rounded-none border border-transparent text-muted-foreground/40 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer"
                title="Inspect in Infrastructure"
              >
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            {docsUrl ? (
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] font-bold tracking-tight text-foreground/90 truncate hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
              >
                {value}
              </a>
            ) : (
              <span
                className={cn(
                  'text-[15px] font-bold tracking-tight text-foreground/90 truncate',
                  mono && 'font-mono text-xs',
                )}
              >
                {value}
              </span>
            )}
          </div>
        )}
        {copyable && copyAria && copyAriaCopied && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? copyAriaCopied : copyAria}
            className="shrink-0 rounded-none border border-transparent p-1 text-muted-foreground/40 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

function MetadataRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground">{label}</span>
      <div className={cn('text-xs font-semibold leading-snug', mono && 'font-mono text-[11px] text-foreground/90')}>
        {value}
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  progress?: number;
}) {
  return (
    <div className="group relative border border-border/60 bg-card px-8 py-9 flex flex-col gap-6 transition-all hover:bg-muted/10 hover:border-primary/40 overflow-hidden min-h-[190px] shadow-sm rounded-none">
      {/* Decorative gauge background with scaled icon */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-500 scale-125 group-hover:scale-150 rotate-6 group-hover:rotate-12 translate-x-4 -translate-y-4">
        {icon && typeof icon === 'object' && 'type' in icon ? (
          <div className="text-[120px] leading-none">{icon}</div>
        ) : icon}
      </div>
      <div className="flex flex-col gap-1.5 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary/60">
            <div className="w-1.5 h-1.5 bg-primary/60" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">{label}</span>
          </div>
          <div className="text-muted-foreground/30 group-hover:text-primary transition-colors">
            {icon}
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-5xl font-bold tracking-tighter leading-none tabular-nums group-hover:text-primary transition-colors">
            {value}
          </span>
          <span className="text-sm font-bold text-muted-foreground/40 uppercase tracking-tight">
            / {hint}
          </span>
        </div>
      </div>

      <div className="mt-auto relative z-10">
        {progress !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-end">
              <span className="text-[10px] font-black tabular-nums text-primary">
                {progress}%
              </span>
            </div>
            <div className="relative h-1.5 w-full bg-muted/20 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  progress > 90 ? "bg-destructive" :
                    progress > 70 ? "bg-amber-500" :
                      "bg-primary"
                )}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
          </div>
        )}
      </div>

      {/* Modern Industrial Pattern */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 right-0 w-16 h-16 bg-[radial-gradient(circle_at_bottom_right,rgba(var(--primary),0.1),transparent)] blur-xl" />
    </div>
  );
}

export const DetailPage = memo(DetailPageInner);
