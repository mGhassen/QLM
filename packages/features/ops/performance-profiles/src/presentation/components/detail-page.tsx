import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, Gauge, Tag } from 'lucide-react';

import type { PerformanceProfile } from '@qlm/domain/entities';
import { cn } from '@qlm/ui/utils';

import { PROVIDER_LABELS, PROVIDER_STYLES } from '../../application/constants';
import { ProfileStatusBadge } from '../cells/profile-status-badge';
import { DetailConfigSection } from './detail-config-section';
import { DetailSpecsSection } from './detail-specs-section';

export type PerformanceProfileDetailPageProps = Readonly<{
  profile: PerformanceProfile;
  onBack?: () => void;
}>;

function PerformanceProfileDetailPageInner({ profile, onBack }: PerformanceProfileDetailPageProps) {
  const { t } = useTranslation('performance-profiles');

  const providerStyle = PROVIDER_STYLES[profile.databaseProvider];
  const providerLabel = PROVIDER_LABELS[profile.databaseProvider] ?? profile.databaseProvider;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background selection:bg-primary selection:text-primary-foreground">
      <header className="shrink-0 border-b-2 border-border bg-card sticky top-0 z-20">
        <div className="px-5">
          <nav aria-label="breadcrumb" className="flex items-center gap-2 pt-3">
            <button
              type="button"
              disabled={!onBack}
              onClick={onBack}
              className={cn(
                'rounded-none border border-transparent px-2 py-1 text-xs font-bold tracking-tight text-muted-foreground transition-colors',
                onBack && 'cursor-pointer hover:text-foreground',
                !onBack && 'cursor-default',
                onBack && 'hover:border-border hover:bg-muted/30',
              )}
            >
              {t('list.title')}
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground/75 shrink-0" />
            <span className="text-xs font-bold tracking-tight text-foreground truncate min-w-0">
              {profile.labelName}
            </span>
          </nav>

          <div className="flex flex-wrap items-start gap-4 py-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label={t('backToList')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border-2 border-border bg-background hover:bg-muted/40 hover:border-foreground transition-colors cursor-pointer group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}

            <div
              className={cn(
                'h-12 w-12 shrink-0 flex items-center justify-center border-2',
                providerStyle ? `${providerStyle.bg} ${providerStyle.border}` : 'bg-muted/50 border-border',
              )}
            >
              <Gauge className={cn('h-6 w-6', providerStyle?.text ?? 'text-muted-foreground')} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold leading-none truncate tracking-tight">
                    {profile.labelName}
                  </h1>
                  <p className="mt-1 text-xs font-mono text-muted-foreground tabular-nums">
                    v{profile.databaseVersion}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ProfileStatusBadge isActive={profile.isActive} />
                  {profile.isDefault && (
                    <span className="inline-flex items-center rounded-none border-2 border-border/60 bg-muted/40 px-2 h-5 text-[10px] font-black uppercase tracking-widest leading-none text-foreground/70">
                      {t('col.default')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 bg-muted/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
              <HeroMetaItem
                label={t('col.provider')}
                value={providerLabel}
                icon={<Tag className="h-3 w-3 shrink-0 opacity-70" />}
                className={providerStyle?.text}
              />
              <HeroMetaItem
                label={t('col.cpu')}
                value={`${(profile.minCpu / 1000).toFixed(1)} vCPU`}
                icon={<Gauge className="h-3 w-3 shrink-0 opacity-70" />}
                mono
              />
              <HeroMetaItem
                label={t('col.memory')}
                value={`${(profile.minMemory / 1024).toFixed(1)} GB`}
                icon={<Gauge className="h-3 w-3 shrink-0 opacity-70" />}
                mono
              />
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable body — 2 inline sections, no tabs */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="px-5 py-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DetailSpecsSection profile={profile} />
            <DetailConfigSection profile={profile} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroMetaItem({
  label,
  value,
  icon,
  className,
  mono,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-1 px-4 py-3 min-w-0', className)}>
      <span className="text-[11px] font-bold tracking-tight text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-semibold tracking-tight truncate',
          mono && 'font-mono text-xs text-foreground/90',
        )}
      >
        {value}
      </span>
    </div>
  );
}

export const PerformanceProfileDetailPage = memo(PerformanceProfileDetailPageInner);
