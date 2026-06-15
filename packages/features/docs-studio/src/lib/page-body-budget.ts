import { pageHasCover, resolveDocChrome } from "./chrome";
import type { LayoutItem } from "./layout-items";
import { assemblePackedPage } from "./layout-items";
import { getPageBodyHeightPx } from "./page-metrics";
import type { ResolvedPageSetup } from "./page-setup";
import type { DocChrome } from "./types";

export interface PageBodyBudgetContext {
  setup: ResolvedPageSetup;
  chrome?: DocChrome;
  title: string;
}

export function chromeForPageBlocks(
  ctx: PageBodyBudgetContext,
  pageNum: number,
  pageBlocks: { type: string }[],
): { showHeader: boolean; showFooter: boolean; isCover: boolean } {
  const isCover = pageHasCover(pageBlocks);
  const resolved = resolveDocChrome(ctx.chrome, { title: ctx.title, page: pageNum, total: pageNum });
  const onCover = isCover && !resolved.showOnCover;
  return {
    isCover,
    showHeader: resolved.showHeader && !onCover,
    showFooter: resolved.showFooter && !onCover,
  };
}

export function bodyHeightForChrome(
  setup: ResolvedPageSetup,
  showHeader: boolean,
  showFooter: boolean,
): number {
  return getPageBodyHeightPx(setup, showHeader, showFooter);
}

/** Usable body height for a page while packing (1-based page index). */
export function bodyHeightForPageBucket(
  ctx: PageBodyBudgetContext,
  pageNum: number,
  bucket: LayoutItem[],
  incoming?: LayoutItem,
): number {
  const preview = incoming ? [...bucket, incoming] : bucket;
  const blocks = preview.length > 0 ? assemblePackedPage(preview).blocks : [];
  const { showHeader, showFooter } = chromeForPageBlocks(ctx, pageNum, blocks);
  return bodyHeightForChrome(ctx.setup, showHeader, showFooter);
}
