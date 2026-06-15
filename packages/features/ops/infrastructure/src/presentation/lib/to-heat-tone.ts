import type { HeatSegmentBarTone } from '@guepard/ui/heat-segment-bar';

import type { Node } from '@guepard/domain/entities';

import { getNodeDisplayState } from './get-node-display-state';

/**
 * Project an 8-kind `NodeDisplayState` onto the 4-tone palette
 * `HeatSegmentBar` ships with. Used by detail-page sub-sections (CPU,
 * memory, storage) and the card heat bars.
 *
 * RFC 0026 §5.4 keeps `NodeDisplayState` presentation-only; this
 * mapping lives in the presentation lib next to its only consumer.
 */
export function toHeatTone(node: Node): HeatSegmentBarTone {
  const kind = getNodeDisplayState(node).kind;
  if (kind === 'running') return 'running';
  if (kind === 'draining' || kind === 'degraded') return 'draining';
  if (kind === 'critical' || kind === 'unreachable') return 'error';
  return 'stopped';
}
