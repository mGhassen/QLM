import { layoutSize } from './studio-transform';
import type { BlockNode } from './types';

/** Height used for split/pack decisions — respects user-set box size, never writes back. */
export function itemPackContentHeight(
  block: BlockNode,
  measured: number,
): number {
  const props = block.props ?? {};
  if (props.height) return layoutSize(props.height, measured);
  if (props.minHeight) return layoutSize(props.minHeight, measured);
  return measured;
}
