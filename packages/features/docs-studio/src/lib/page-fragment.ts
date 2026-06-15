/** Runtime-only slice of a block across pages. Never persisted in the document. */
export interface BlockPageFragment {
  blockId: string;
  index: number;
  total: number;
  content: string;
}

export function createPageFragment(
  blockId: string,
  index: number,
  total: number,
  content: string,
): BlockPageFragment {
  return { blockId, index, total, content };
}

export function fragmentItemKey(blockId: string, index: number): string {
  return `${blockId}#${index}`;
}

/** Ensure a layout-item key is unique among existing keys. */
export function uniqueLayoutItemKey(
  preferred: string,
  reserved: ReadonlySet<string>,
): string {
  if (!reserved.has(preferred)) return preferred;
  let n = 1;
  while (reserved.has(`${preferred}~${n}`)) n++;
  return `${preferred}~${n}`;
}

export function isFragmentContinuation(fragment?: BlockPageFragment): boolean {
  return !!fragment && fragment.index > 0;
}

export function fragmentDataAttrs(
  fragment?: BlockPageFragment,
): Record<string, string | undefined> {
  if (!fragment || fragment.total <= 1) return {};
  return {
    'data-page-fragment': `${fragment.index + 1}/${fragment.total}`,
    'data-page-fragment-continued': fragment.index > 0 ? 'true' : undefined,
  };
}

/** Key for the nth occurrence of a block on one page (0 = first). */
export function pageFragmentKey(blockId: string, occurrence: number): string {
  return occurrence === 0 ? blockId : `${blockId}@${occurrence}`;
}

export function takePageFragment(
  blockId: string,
  fragments: Record<string, BlockPageFragment> | undefined,
  occurrence: Map<string, number>,
): { fragment?: BlockPageFragment; occurrence: number } {
  if (!fragments) return { occurrence: 0 };
  const n = occurrence.get(blockId) ?? 0;
  occurrence.set(blockId, n + 1);
  return { fragment: fragments[pageFragmentKey(blockId, n)], occurrence: n };
}
