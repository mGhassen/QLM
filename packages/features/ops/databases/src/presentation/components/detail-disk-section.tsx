import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';

import type { Database } from '@guepard/domain/entities';
import { DataRow, EntitySection } from '@guepard/ui/entity-primitives';

export type DetailDiskSectionProps = Readonly<{ database: Database }>;

function DetailDiskSectionInner({ database }: DetailDiskSectionProps) {
  const { t } = useTranslation('databases');
  const configFlags = database.compute?.performanceProfile?.configFlags;
  const entries = configFlags ? Object.entries(configFlags) : [];

  return (
    <EntitySection title={t('detail.disk.title')} className="">
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest italic opacity-60 underline decoration-dotted">
          {t('detail.disk.configEmpty')}
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

export const DetailDiskSection = memo(DetailDiskSectionInner);
