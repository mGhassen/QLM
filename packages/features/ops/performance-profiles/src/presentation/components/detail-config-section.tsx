import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';

import type { PerformanceProfile } from '@qlm/domain/entities';
import { DataRow, EntitySection } from '@qlm/ui/entity-primitives';

export type DetailConfigSectionProps = Readonly<{ profile: PerformanceProfile }>;

function DetailConfigSectionInner({ profile }: DetailConfigSectionProps) {
  const { t } = useTranslation('performance-profiles');
  const entries = profile.configFlags ? Object.entries(profile.configFlags) : [];

  return (
    <EntitySection title={t('detail.config.title')} className="">
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-[11px] font-bold tracking-tight opacity-60 underline decoration-dotted">
          {t('detail.config.empty')}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border/50">
          {entries.map(([key, val]) => (
            <DataRow
              key={key}
              icon={<Settings2 className="h-3 w-3" />}
              label={key}
              value={String(val)}
              mono
            />
          ))}
        </div>
      )}
    </EntitySection>
  );
}

export const DetailConfigSection = memo(DetailConfigSectionInner);
