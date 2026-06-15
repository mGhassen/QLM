import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Node } from '@qlm/domain/entities';
import { cn } from '@qlm/ui/utils';

import { DISPLAY_BADGE_CLASSES } from '../../application/constants';
import {
  getNodeDisplayState,
  type NodeDisplayKind,
} from '../lib/get-node-display-state';

export type HealthStatusBadgeProps = Readonly<{
  /**
   * Subset of the Node entity needed to derive the composite badge.
   * Accepts a full `Node` too — Pick is structural.
   */
  node: Pick<
    Node,
    'lifecycle' | 'orchestration' | 'eligibility' | 'drain' | 'health'
  >;
  className?: string;
}>;

function HealthStatusBadgeInner({ node, className }: HealthStatusBadgeProps) {
  const { t } = useTranslation('nodes');
  const display = getNodeDisplayState(node);
  const label = t(`displayState.${display.kind}` as const);

  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      data-display-kind={display.kind satisfies NodeDisplayKind}
      className={cn(
        'inline-flex items-center rounded-none border px-2 h-5 text-[10px] font-black uppercase tracking-widest leading-none',
        DISPLAY_BADGE_CLASSES[display.kind],
        // draining + critical wave a small live signal — never decorative.
        display.kind === 'draining' && '[&_span]:animate-pulse',
        className,
      )}
    >
      <span className="inline-block translate-y-[0.5px]">{label}</span>
    </span>
  );
}

export const HealthStatusBadge = memo(HealthStatusBadgeInner);
