import type { BlockNode } from './types';

export function isCoverSection(block: BlockNode): boolean {
  return block.type === 'section' && block.props?.variant === 'cover';
}

export function isCoverPageBlock(page: BlockNode): boolean {
  if (page.type !== 'page') return false;
  return (page.children ?? []).some(isCoverSection);
}
