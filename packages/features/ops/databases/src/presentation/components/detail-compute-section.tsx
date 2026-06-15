import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, Gauge, MemoryStick, Zap } from 'lucide-react';

import type { Database } from '@guepard/domain/entities';
import { DataRow, EntitySection } from '@guepard/ui/entity-primitives';

export type DetailComputeSectionProps = Readonly<{ database: Database }>;

function DetailComputeSectionInner({ database }: DetailComputeSectionProps) {
  const { t } = useTranslation('databases');
  const compute = database.compute;
  const perf = compute?.performanceProfile;

  const cpuCores = perf ? (perf.minCpu / 1000).toFixed(1) : undefined;
  const memoryGb = perf ? (perf.minMemory / 1024).toFixed(1) : undefined;

  return (
    <EntitySection title={t('detail.compute.title')} className="">
      <div className="flex flex-col divide-y divide-border/50">
        <DataRow
          icon={<Cpu className="h-3 w-3" />}
          label={t('detail.compute.cpu')}
          value={cpuCores ? `${cpuCores} vCPU` : undefined}
          mono
        />
        <DataRow
          icon={<MemoryStick className="h-3 w-3" />}
          label={t('detail.compute.memory')}
          value={memoryGb ? `${memoryGb} GB` : undefined}
          mono
        />
        <DataRow
          icon={<Gauge className="h-3 w-3" />}
          label={t('detail.compute.tier')}
          value={perf?.labelName}
        />
        <DataRow
          icon={<Zap className="h-3 w-3" />}
          label={t('detail.compute.status')}
          value={compute?.computeStatus ?? compute?.jobStatus}
          mono
        />
      </div>
    </EntitySection>
  );
}

export const DetailComputeSection = memo(DetailComputeSectionInner);
