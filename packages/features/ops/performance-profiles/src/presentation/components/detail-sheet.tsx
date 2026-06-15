import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Gauge, Tag, Database, Cpu, HardDrive, FileCode, Star, Globe, Layers, Check, Copy } from 'lucide-react';

import type { PerformanceProfile } from '@qlm/domain/entities';
import { EntitySheetBody, EntitySheetHeader, EntitySheetFooter } from '@qlm/ui/entity-sheet';
import { BadgeItem, EntitySection, ResourceCard, DataRow } from '@qlm/ui/entity-primitives';
import { Button } from '@qlm/ui/button';
import { cn } from '@qlm/ui/utils';
import { toast } from '@qlm/ui/sonner';

import { PROVIDER_LABELS, PROVIDER_STYLES } from '../../application/constants';
import { ProfileStatusBadge } from '../cells/profile-status-badge';
import { DetailConfigSection } from './detail-config-section';
import { DetailSpecsSection } from './detail-specs-section';

export type PerformanceProfileDetailSheetProps = Readonly<{
  profile: PerformanceProfile;
}>;

function PerformanceProfileDetailSheetInner({ profile }: PerformanceProfileDetailSheetProps) {
  const { t } = useTranslation('performance-profiles');

  const providerStyle = PROVIDER_STYLES[profile.databaseProvider];
  const providerLabel =
    PROVIDER_LABELS[profile.databaseProvider] ?? profile.databaseProvider;

  return (
    <>
      <EntitySheetHeader
        icon={<Gauge className={cn('h-6 w-6', providerStyle?.text ?? 'text-muted-foreground')} />}
        iconClassName={cn(providerStyle?.bg, providerStyle?.border)}
        title={profile.labelName}
        meta={
          <div className="flex items-center gap-2">
            <ProfileStatusBadge isActive={profile.isActive} />
            {profile.isDefault && (
              <span className="inline-flex items-center rounded-none border-2 border-border/60 bg-muted/40 px-2 h-5 text-[10px] font-black uppercase tracking-widest leading-none text-foreground/70">
                {t('col.default')}
              </span>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={async () => {
                await navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
                toast.success(t('jsonCopied', { defaultValue: 'JSON Copied' }));
              }}
              title={t('common.copyJson', { defaultValue: 'Copy JSON' })}
              className="h-7 w-7 rounded-none border cursor-pointer"
            >
              <FileCode className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5 px-8 py-4 bg-muted/10 border-b border-border/30">
        <div className={cn('flex items-center gap-2 rounded-none px-2.5 py-1 border bg-background', providerStyle?.text)}>
          <span className="text-[10px] font-bold tracking-tight uppercase">
            {providerLabel}
          </span>
        </div>
        <BadgeItem icon={<Tag className="h-3 w-3" />} label={`v${profile.databaseVersion}`} />
      </div>

      <EntitySheetBody>
        <div className="flex flex-col gap-6 py-6 px-8">
          {/* Resource Tiles */}
          <div className="grid grid-cols-2 gap-4">
            <ResourceCard
              label={t('col.cpu')}
              value={(profile.minCpu / 1000).toFixed(1)}
              unit="vCPU"
              icon={<Cpu className="h-3 w-3" />}
            />
            <ResourceCard
              label={t('col.memory')}
              value={(profile.minMemory / 1024).toFixed(1)}
              unit="GB"
              icon={<Database className="h-3 w-3" />}
            />
          </div>

          <div className="flex flex-col gap-6">
            <DetailSpecsSection profile={profile} />
            <DetailConfigSection profile={profile} />
          </div>
        </div>
      </EntitySheetBody>
    </>
  );
}

export const PerformanceProfileDetailSheet = memo(PerformanceProfileDetailSheetInner);

