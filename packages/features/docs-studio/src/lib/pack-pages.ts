import { assemblePackedPage, type LayoutItem, type PackedPage } from "./layout-items";
import { bodyHeightForPageBucket, type PageBodyBudgetContext } from "./page-body-budget";
import { sectionTopOverhead, itemPackNeed } from "./section-pack-overhead";

function bucketSourcePageId(bucket: LayoutItem[]): string | undefined {
  return bucket.find((item) => item.sourcePageId)?.sourcePageId;
}

export function packLayoutItems(
  items: LayoutItem[],
  heights: Map<string, number>,
  ctx: PageBodyBudgetContext,
): PackedPage[] {
  if (items.length === 0) return [{ blocks: [], fragments: {} }];

  const pages: PackedPage[] = [];
  let bucket: LayoutItem[] = [];
  let used = 0;
  let pageNum = 1;
  let continuationForNext = false;

  const flush = (isContinuation = false) => {
    if (bucket.length === 0) return;
    const assembled = assemblePackedPage(bucket);
    pages.push({
      ...assembled,
      sourcePageId: bucketSourcePageId(bucket) ?? assembled.sourcePageId,
      isContinuation: isContinuation || continuationForNext,
    });
    continuationForNext = false;
    bucket = [];
    used = 0;
    pageNum += 1;
  };

  for (const item of items) {
    if (item.isBreak) {
      if (bucket.length > 0) flush();
      bucket.push(item);
      continue;
    }

    const h = heights.get(item.key) ?? 0;

    if (item.isCover) {
      flush();
      pages.push({
        blocks: [item.block],
        fragments: {},
        sourcePageId: item.sourcePageId,
        isContinuation: false,
      });
      pageNum = pages.length + 1;
      continue;
    }

    if (item.forceBreakBefore && bucket.length > 0) {
      flush();
    }

    const bodyHeightPx = bodyHeightForPageBucket(ctx, pageNum, bucket);

    if (bucket.length > 0 && used + itemPackNeed(item, bucket, h) > bodyHeightPx) {
      const samePage = item.sourcePageId && item.sourcePageId === bucketSourcePageId(bucket);
      flush(!!samePage);
    }

    const topPad = sectionTopOverhead(item, bucket);
    bucket.push(item);
    used += topPad + h;
  }

  flush();
  return pages.length > 0 ? pages : [{ blocks: [], fragments: {} }];
}
