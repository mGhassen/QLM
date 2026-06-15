import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Boxes } from 'lucide-react';

import type { Node } from '@guepard/domain/entities';

import { EntitySection } from '@guepard/ui/entity-primitives';

export type NodeDetailServicesSectionProps = Readonly<{ node: Node }>;

function NodeDetailServicesSectionInner({ node: _node }: NodeDetailServicesSectionProps) {
  const { t } = useTranslation('nodes');

  return (
    <div className="flex flex-col gap-6">
      <EntitySection title={t('workloads')}>
        <NodeDetailEmpty
          icon={<Boxes className="text-muted-foreground h-6 w-6" />}
          title={t('title')}
          description={t('description')}
        />
      </EntitySection>
    </div>
  );
}

type NodeDetailEmptyProps = Readonly<{
  icon: React.ReactNode;
  title: string;
  description: string;
}>;

function NodeDetailEmpty({ icon, title, description }: NodeDetailEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="bg-muted/50 border-border flex h-12 w-12 items-center justify-center rounded-none border">
        {icon}
      </div>
      <p className="text-foreground text-base font-semibold">{title}</p>
      <p className="text-muted-foreground mx-auto max-w-md text-sm">
        {description}
      </p>
    </div>
  );
}

export const NodeDetailServicesSection = memo(NodeDetailServicesSectionInner);
