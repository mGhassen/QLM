import type { BlockPageFragment } from './page-fragment';

export function resolveBlockContent(
  block: {
    content?: string;
    contentRef?: string;
    props?: Record<string, unknown>;
  },
  sections: Record<string, string>,
  fragment?: BlockPageFragment,
): string {
  if (fragment) return fragment.content;

  if (block.content) return block.content;
  if (block.contentRef && sections[block.contentRef])
    return sections[block.contentRef];
  return '';
}
