import type { BlockNode } from '../types';
import { IMPORT_ASSET_PREFIX } from './types';

function rewriteContent(
  content: string | undefined,
  slug: string,
): string | undefined {
  if (!content) return content;
  return content.replaceAll(IMPORT_ASSET_PREFIX, `/docs/${slug}/`);
}

function walkBlocks(blocks: BlockNode[], slug: string): BlockNode[] {
  return blocks.map((block) => ({
    ...block,
    content: rewriteContent(block.content, slug),
    children: block.children ? walkBlocks(block.children, slug) : undefined,
  }));
}

export function resolveImportAssetPaths(
  blocks: BlockNode[],
  slug: string,
): BlockNode[] {
  return walkBlocks(blocks, slug);
}
