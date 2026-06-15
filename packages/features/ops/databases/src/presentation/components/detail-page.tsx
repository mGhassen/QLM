import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  FileCode,
  Gauge,
  Globe,
  HardDrive,
  Network,
  Trash2,
} from 'lucide-react';

import type { DatabaseOutput } from '@qlm/domain/usecases';
import { Button } from '@qlm/ui/button';
import { DbProviderIcon } from '@qlm/ui/db-provider-icon';
import { EntitySection } from '@qlm/ui/entity-primitives';
import { cn } from '@qlm/ui/utils';

import { PROVIDER_STYLES } from '../../application/constants';
import { DbProviderBadge } from '../cells/db-provider-badge';
import { DbStatusBadge } from '../cells/db-status-badge';
import { DetailComputeSection } from './detail-compute-section';
import { DetailDiskSection } from './detail-disk-section';
import { DetailProfileSection } from './detail-profile-section';

export type DatabaseDetailPageProps = Readonly<{
  database: DatabaseOutput;
  onBack?: () => void;
  onDelete?: (id: string) => Promise<void>;
}>;

function DatabaseDetailPageInner({ database, onBack, onDelete }: DatabaseDetailPageProps) {
  const { t } = useTranslation('databases');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const providerStyle = PROVIDER_STYLES[database.provider];
  const perf = database.compute?.performanceProfile;
  const tierLabel = perf?.labelName;

  const cpuCores = perf ? (perf.minCpu / 1000).toFixed(1) : undefined;
  const memoryGb = perf ? (perf.minMemory / 1024).toFixed(1) : undefined;
  // Fallbacks for utilization until telemetry is integrated
  const cpuPct = undefined as number | undefined;
  const memPct = undefined as number | undefined;
  const diskPct = undefined as number | undefined;
  const diskGb = undefined as number | undefined; // Assuming disk info comes from other sections or compute

  const getProviderDocUrl = (provider: string, version?: string) => {
    switch (provider) {
      case 'postgres':
        const pgVer = version ? version.split('.')[0] : 'current';
        return `https://www.postgresql.org/docs/${pgVer}/index.html`;
      case 'mysql':
        const myVer = version ? version.split('.').slice(0, 2).join('.') : '8.0';
        return `https://dev.mysql.com/doc/refman/${myVer}/en/`;
      case 'redis':
        return 'https://redis.io/docs/latest/';
      case 'mongodb':
        const mongoVer = version ? `v${version.split('.').slice(0, 2).join('.')}` : 'manual';
        return `https://www.mongodb.com/docs/${mongoVer}/`;
      default:
        return undefined;
    }
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
                {database.name}
              </span>
            </div>
          </nav>

          <div className="flex items-start gap-6 pt-4 pb-8">
            <div
              className={cn(
                'h-[110px] w-[110px] shrink-0 flex items-center justify-center border border-border bg-background shadow-sm transition-all hover:border-primary/50 group relative overflow-hidden',
                providerStyle ? `${providerStyle.bg} ${providerStyle.border}` : 'bg-muted/5',
              )}
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              {DbProviderIcon({ provider: database.provider, size: 48, className: 'relative z-10' }) ?? (
                <Database className={cn('h-12 w-12 relative z-10', providerStyle ? providerStyle.text : 'text-muted-foreground')} />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-5 pt-1">
              <div className="flex flex-col gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold uppercase tracking-tighter leading-none truncate underline decoration-primary/20 decoration-2 underline-offset-4">
                      {database.name}
                    </h1>
                    <DbStatusBadge status={database.status} className="h-6 px-2 text-[10px] shrink-0" />
                  </div>
                </div>

                <div className="flex items-center gap-1 w-fit mt-1">
                  <ActionButton
                    icon={<FileCode className="h-3.5 w-3.5" />}
                    onClick={async () => {
                      await navigator.clipboard.writeText(JSON.stringify(database, null, 2));
                    }}
                    title={t('common.copyJson', { defaultValue: 'Copy JSON' })}
                    activeTone="hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  />
                  {onDelete && (
                    <ActionButton
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => setDeleteConfirmOpen(true)}
                      title={t('actions.delete')}
                      activeTone="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-border/30">
              <HeroMetaItem
                label={t('col.provider')}
                value={database.provider}
                icon={<Database className="h-3.5 w-3.5 opacity-70" />}
                docsUrl={getProviderDocUrl(database.provider)}
              />
              <HeroMetaItem
                label={t('col.version')}
                value={`v${database.version}`}
                icon={<FileCode className="h-3.5 w-3.5 opacity-70" />}
                docsUrl={getProviderDocUrl(database.provider, database.version)}
                mono
              />
              <HeroMetaItem
                label={t('col.fqdn')}
                value={database.fqdn}
                icon={<Globe className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                mono
                copyable
                copyAria={t('detail.copyValue')}
                copyAriaCopied={t('detail.copiedValue')}
              />
              {database.port && (
                <HeroMetaItem
                  label={t('col.port')}
                  value={String(database.port)}
                  icon={<Network className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                  mono
                  copyable
                  copyAria={t('detail.copyValue')}
                  copyAriaCopied={t('detail.copiedValue')}
                />
              )}
              {tierLabel && (
                <HeroMetaItem
                  label={t('detail.compute.tier')}
                  value={tierLabel}
                  icon={<Gauge className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                  badge
                />
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] pointer-events-none" />

        <div className="max-w-[1240px] mx-auto px-8 py-10 relative z-10">
          <EntitySection title={t('detail.section.overview')} className="mb-14">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <StatTile
                icon={<Cpu className="h-5 w-5" />}
                label={t('detail.compute.cpu')}
                value={cpuPct !== undefined && cpuCores ? ((cpuPct * parseFloat(cpuCores)) / 100).toFixed(1) : (cpuCores ?? '0.0')}
                hint={cpuCores ? `${cpuCores} vCPU` : '—'}
                progress={cpuPct ?? 0}
              />
              <StatTile
                icon={<Activity className="h-5 w-5" />}
                label={t('detail.compute.memory')}
                value={memPct !== undefined && memoryGb ? ((memPct * parseFloat(memoryGb)) / 100).toFixed(1) : (memoryGb ?? '0.0')}
                hint={memoryGb ? `${memoryGb} GB` : '—'}
                progress={memPct ?? 0}
              />
              <StatTile
                icon={<HardDrive className="h-5 w-5" />}
                label="Storage"
                value={
                  diskPct !== undefined && diskGb !== undefined
                    ? ((diskPct * diskGb) / 100).toFixed(1)
                    : (diskGb !== undefined ? diskGb.toString() : '—')
                }
                hint={diskGb !== undefined ? `${diskGb} GB` : '—'}
                progress={diskPct ?? 0}
              />
            </div>
          </EntitySection>

          <div className="max-w-4xl flex flex-col gap-16">
            <DetailComputeSection database={database} />
            <DetailProfileSection database={database} />
            <DetailDiskSection database={database} />
          </div>
        </div>
      </div>
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
  docsUrl?: string;
}) {
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

      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 right-0 w-16 h-16 bg-[radial-gradient(circle_at_bottom_right,rgba(var(--primary),0.1),transparent)] blur-xl" />
    </div>
  );
}

export const DatabaseDetailPage = memo(DatabaseDetailPageInner);
