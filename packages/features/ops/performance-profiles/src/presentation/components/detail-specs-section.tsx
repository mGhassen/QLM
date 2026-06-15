import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Gauge, Star } from 'lucide-react';

import type { PerformanceProfile } from '@guepard/domain/entities';
import { DataRow, EntitySection } from '@guepard/ui/entity-primitives';
import { ProfileStatusBadge } from '../cells/profile-status-badge';

export type DetailSpecsSectionProps = Readonly<{ profile: PerformanceProfile }>;

function DetailSpecsSectionInner({ profile }: DetailSpecsSectionProps) {
  const { t } = useTranslation('performance-profiles');

  return (
    <EntitySection title={t('detail.specs.title')} className="">
      <div className="flex flex-col divide-y divide-border/50">
        <DataRow
          icon={<Gauge className="h-3 w-3" />}
          label={t('detail.specs.active')}
          valueNode={<ProfileStatusBadge isActive={profile.isActive} />}
        />
        {profile.isDefault ? (
          <DataRow
            icon={<Star className="h-3 w-3" />}
            label={t('detail.specs.default')}
            value={t('detail.specs.default')}
          />
        ) : (
          <DataRow
            icon={<Star className="h-3 w-3 opacity-20" />}
            label={t('detail.specs.default')}
            value="—"
          />
        )}
      </div>
    </EntitySection>
  );
}

export const DetailSpecsSection = memo(DetailSpecsSectionInner);
